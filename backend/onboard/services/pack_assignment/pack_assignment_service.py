import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import set_committed_value

from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.core.rag.extract import extract_document
from onboard.core.storage.supabase_client import SupabaseStorageClient, get_storage_client
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import DocPackDocument, PackAssignment, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.quiz_attempt import QuizAttempt
from onboard.dao.models.quiz_template import QuizTemplate, QuizType
from onboard.dao.pack_assignment_dao import PackAssignmentAckDAO, PackAssignmentDAO
from onboard.dao.quiz_attempt_dao import QuizAttemptDAO
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.pack_assignment.assign_helpers import compute_due_at, notify_assigned


@dataclass
class AssignmentDetail:
    assignment: PackAssignment
    doc_pack_name: str
    documents: list[tuple[DocPackDocument, datetime | None]]
    quiz_unlocked: bool
    # Hard-lock sequencing: True when an earlier required track in the org sequence isn't passed yet.
    locked: bool = False
    locked_by_name: str | None = None
    due_at: datetime | None = None
    estimated_minutes: int | None = None
    pass_pct: int | None = None


@dataclass
class CohortTrack:
    id: str
    name: str
    sequence_order: int


@dataclass
class CohortEmployeeRow:
    employee_id: str
    employee_name: str
    cells: dict[str, PackAssignmentStatus]
    passed_count: int
    total_count: int


@dataclass
class CohortDashboardData:
    tracks: list[CohortTrack]
    employees: list[CohortEmployeeRow]
    total_assignments: int
    passed_assignments: int
    overdue_assignments: int
    not_started_assignments: int
    completion_pct: int
    avg_days_to_onboard: float | None
    fully_onboarded_count: int


@dataclass
class DocumentContent:
    document_id: str
    title: str
    file_type: str
    content: str
    # Short-lived Supabase signed URL for PDFs (browser loads storage directly).
    file_url: str | None = None


class PackAssignmentService:
    """Doc Pack assignment read-gate → quiz state machine (Doc Pack PRD §4/§6)."""

    def __init__(self, session: AsyncSession, storage: SupabaseStorageClient | None = None):
        self.session = session
        self.assignment_dao = PackAssignmentDAO(session)
        self.ack_dao = PackAssignmentAckDAO(session)
        self.doc_pack_dao = DocPackDAO(session)
        self.employee_dao = EmployeeDAO(session)
        self.template_dao = QuizTemplateDAO(session)
        self.attempt_dao = QuizAttemptDAO(session)
        self._storage = storage

    async def _storage_client(self) -> SupabaseStorageClient:
        if self._storage is None:
            self._storage = await get_storage_client()
        return self._storage

    @staticmethod
    def assert_can_access_assignment(assignment: PackAssignment, actor: Employee) -> None:
        """Admins may access any assignment; members only their own."""
        if actor.app_role == APP_ROLE_ADMIN:
            return
        if assignment.employee_id == actor.id:
            return
        raise ForbiddenError("You can only access your own assignments")

    async def _resolve_document(
        self, org_id: str, assignment_id: str, document_id: str, *, actor: Employee
    ) -> tuple[PackAssignment, DocPackDocument]:
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        self.assert_can_access_assignment(assignment, actor)

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, assignment.doc_pack_id)
        assert pack is not None
        document = next((doc for doc in pack.documents if doc.id == document_id), None)
        if document is None:
            raise NotFoundError(f"Document {document_id} not in this assignment's pack")
        return assignment, document

    async def get_document_content(
        self, org_id: str, assignment_id: str, document_id: str, *, actor: Employee
    ) -> DocumentContent:
        """Reading payload for one document in an assignment (Doc Pack PRD §4 read-gate).

        PDFs return a short-lived signed URL only — no download/extract on this path, so the
        viewer can open immediately against storage. Text-like files still extract plain text.
        """
        _, document = await self._resolve_document(org_id, assignment_id, document_id, actor=actor)
        storage = await self._storage_client()
        file_type = document.file_type.lower()

        if file_type == "pdf":
            file_url = await storage.signed_url(document.storage_path, expires_in_seconds=3600)
            return DocumentContent(
                document_id=document.id,
                title=document.title,
                file_type=document.file_type,
                content="",
                file_url=file_url,
            )

        raw = await storage.download(document.storage_path)
        extracted = await asyncio.to_thread(extract_document, raw, document.file_type)
        return DocumentContent(
            document_id=document.id,
            title=document.title,
            file_type=document.file_type,
            content=extracted.full_text,
            file_url=None,
        )

    async def create_assignments(
        self, org_id: str, pack_id: str, employee_ids: list[str], assigned_by: str | None
    ) -> list[PackAssignment]:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")

        published = await self.template_dao.get_latest_published_for_source(pack_id, QuizType.doc_pack)
        if published is None:
            raise ValidationError("This pack has no published quiz yet — save a curated quiz before assigning")

        now = datetime.now(UTC)
        due_at = compute_due_at(pack, now)
        created: list[PackAssignment] = []
        for employee_id in employee_ids:
            employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
            if employee is None:
                raise NotFoundError(f"Employee {employee_id} not found")

            existing = await self.assignment_dao.get_for_pack_and_employee(pack_id, employee_id)
            if existing is not None:
                created.append(existing)
                continue

            assignment = await self.assignment_dao.create(
                org_id=org_id,
                doc_pack_id=pack_id,
                employee_id=employee_id,
                assigned_by=assigned_by,
                status=PackAssignmentStatus.assigned,
                quiz_template_id=published.id,
                due_at=due_at,
            )
            # New rows have no acks; mark loaded so response serialization doesn't
            # lazy-load (async MissingGreenlet / 500).
            set_committed_value(assignment, "acks", [])
            await notify_assigned(self.session, org_id, employee_id, pack, assignment.id)
            created.append(assignment)
        return created

    async def list_for_pack(self, org_id: str, pack_id: str) -> list[PackAssignment]:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")
        return await self.assignment_dao.list_for_pack(org_id, pack_id)

    @staticmethod
    def _compute_locks(assignments: list[PackAssignment]) -> dict[str, tuple[bool, str | None]]:
        """Hard-lock sequencing: walking the org sequence, exactly the earliest not-yet-passed track is
        actionable; every track after it is locked by that track's name. Earlier (passed) tracks stay open."""
        ordered = sorted(
            assignments,
            key=lambda a: (a.doc_pack.sequence_order if a.doc_pack else 0, a.assigned_at),
        )
        locks: dict[str, tuple[bool, str | None]] = {}
        blocker_name: str | None = None
        for assignment in ordered:
            locks[assignment.id] = (blocker_name is not None, blocker_name)
            if blocker_name is None and assignment.status != PackAssignmentStatus.passed:
                blocker_name = assignment.doc_pack.name if assignment.doc_pack else "an earlier track"
        return locks

    async def list_for_employee(
        self, org_id: str, employee_id: str, *, actor: Employee
    ) -> list[tuple[PackAssignment, str, bool, str | None]]:
        """Return (assignment, doc_pack_name, locked, locked_by_name) tuples the actor is allowed to see."""
        if actor.app_role != APP_ROLE_ADMIN and actor.id != employee_id:
            raise ForbiddenError("You can only list your own assignments")
        employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
        if employee is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        assignments = await self.assignment_dao.list_for_employee(org_id, employee_id)
        locks = self._compute_locks(assignments)
        result = []
        for assignment in assignments:
            locked, locked_by = locks.get(assignment.id, (False, None))
            name = assignment.doc_pack.name if assignment.doc_pack else "Doc pack"
            result.append((assignment, name, locked, locked_by))
        return result

    async def list_recent_outcomes(self, org_id: str, *, limit: int = 50) -> list[PackAssignment]:
        """Org-admin inbox of recent quiz pass/fail outcomes."""
        return await self.assignment_dao.list_recent_outcomes(org_id, limit=limit)

    async def get_cohort_dashboard(self, org_id: str) -> "CohortDashboardData":
        """Employees × tracks completion matrix + org onboarding stats (Track PRD §cohort dashboard)."""
        assignments = await self.assignment_dao.list_all_for_org(org_id)
        now = datetime.now(UTC)

        tracks: dict[str, tuple[str, int]] = {}
        employees: dict[str, str] = {}
        cells: dict[str, dict[str, PackAssignmentStatus]] = {}
        emp_assigned_at: dict[str, datetime] = {}
        emp_completed_at: dict[str, datetime | None] = {}
        emp_all_passed: dict[str, bool] = {}

        total = passed = overdue = not_started = 0
        for a in assignments:
            pack_name = a.doc_pack.name if a.doc_pack else "Track"
            seq = a.doc_pack.sequence_order if a.doc_pack else 0
            tracks[a.doc_pack_id] = (pack_name, seq)
            emp_name = a.employee.name if a.employee else "Team member"
            employees[a.employee_id] = emp_name
            cells.setdefault(a.employee_id, {})[a.doc_pack_id] = a.status

            total += 1
            is_passed = a.status == PackAssignmentStatus.passed
            if is_passed:
                passed += 1
            if a.status == PackAssignmentStatus.assigned:
                not_started += 1
            if a.due_at is not None and a.due_at < now and not is_passed:
                overdue += 1

            # Time-to-onboard bookkeeping: earliest assignment start, latest completion, all-passed flag.
            if a.employee_id not in emp_assigned_at or a.assigned_at < emp_assigned_at[a.employee_id]:
                emp_assigned_at[a.employee_id] = a.assigned_at
            emp_all_passed[a.employee_id] = emp_all_passed.get(a.employee_id, True) and is_passed
            if is_passed and a.completed_at is not None:
                prev = emp_completed_at.get(a.employee_id)
                if prev is None or a.completed_at > prev:
                    emp_completed_at[a.employee_id] = a.completed_at

        durations = [
            (emp_completed_at[eid] - emp_assigned_at[eid]).total_seconds() / 86400
            for eid, all_passed in emp_all_passed.items()
            if all_passed and emp_completed_at.get(eid) is not None and eid in emp_assigned_at
        ]
        fully_onboarded = len(durations)
        avg_days = round(sum(durations) / fully_onboarded, 1) if fully_onboarded else None

        track_rows = [
            CohortTrack(id=tid, name=name, sequence_order=seq)
            for tid, (name, seq) in sorted(tracks.items(), key=lambda kv: (kv[1][1], kv[1][0]))
        ]
        employee_rows = []
        for eid, name in sorted(employees.items(), key=lambda kv: kv[1].lower()):
            emp_cells = cells.get(eid, {})
            emp_passed = sum(1 for s in emp_cells.values() if s == PackAssignmentStatus.passed)
            employee_rows.append(
                CohortEmployeeRow(
                    employee_id=eid,
                    employee_name=name,
                    cells=emp_cells,
                    passed_count=emp_passed,
                    total_count=len(emp_cells),
                )
            )

        completion_pct = round(passed / total * 100) if total else 0
        return CohortDashboardData(
            tracks=track_rows,
            employees=employee_rows,
            total_assignments=total,
            passed_assignments=passed,
            overdue_assignments=overdue,
            not_started_assignments=not_started,
            completion_pct=completion_pct,
            avg_days_to_onboard=avg_days,
            fully_onboarded_count=fully_onboarded,
        )

    async def get_assignment_detail(self, org_id: str, assignment_id: str, *, actor: Employee) -> AssignmentDetail:
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        self.assert_can_access_assignment(assignment, actor)

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, assignment.doc_pack_id)
        assert pack is not None

        ack_by_doc = {ack.document_id: ack.acknowledged_at for ack in assignment.acks}
        documents = [(doc, ack_by_doc.get(doc.id)) for doc in pack.documents]
        quiz_unlocked = bool(pack.documents) and all(ack_by_doc.get(doc.id) is not None for doc in pack.documents)

        # Sequencing: recompute locks across the employee's whole assignment set.
        siblings = await self.assignment_dao.list_for_employee(org_id, assignment.employee_id)
        locked, locked_by = self._compute_locks(siblings).get(assignment.id, (False, None))

        return AssignmentDetail(
            assignment=assignment,
            doc_pack_name=pack.name,
            documents=documents,
            quiz_unlocked=quiz_unlocked,
            locked=locked,
            locked_by_name=locked_by,
            due_at=assignment.due_at,
            estimated_minutes=pack.estimated_minutes,
            pass_pct=pack.pass_pct,
        )

    async def revoke_assignment(self, org_id: str, assignment_id: str) -> None:
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        if assignment.status == PackAssignmentStatus.passed:
            raise ValidationError("Cannot revoke an assignment that has already passed (Doc Pack PRD §10.15)")
        await self.assignment_dao.delete(assignment.id)

    async def ack_document(
        self, org_id: str, assignment_id: str, document_id: str, *, actor: Employee
    ) -> PackAssignment:
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        self.assert_can_access_assignment(assignment, actor)

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, assignment.doc_pack_id)
        assert pack is not None
        if document_id not in {doc.id for doc in pack.documents}:
            raise NotFoundError(f"Document {document_id} not in this pack")

        existing_ack = await self.ack_dao.get_for_assignment_and_document(assignment.id, document_id)
        if existing_ack is None:
            await self.ack_dao.create(assignment_id=assignment.id, document_id=document_id)

        # Only progress the pre-quiz phase forward — never regress a started/completed assignment.
        if assignment.status in (
            PackAssignmentStatus.assigned,
            PackAssignmentStatus.reading,
            PackAssignmentStatus.ready_for_quiz,
        ):
            if assignment.status == PackAssignmentStatus.assigned:
                await self.assignment_dao.update(assignment.id, status=PackAssignmentStatus.reading)
            ack_count = await self.ack_dao.count_for_assignment(assignment.id)
            if pack.documents and ack_count >= len(pack.documents):
                await self.assignment_dao.update(assignment.id, status=PackAssignmentStatus.ready_for_quiz)

        refreshed = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        assert refreshed is not None
        return refreshed

    async def start_quiz(self, org_id: str, assignment_id: str, *, actor: Employee) -> tuple[QuizAttempt, QuizTemplate]:
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        self.assert_can_access_assignment(assignment, actor)

        if assignment.status == PackAssignmentStatus.passed:
            raise ValidationError("This assignment has already been passed")
        # Hard-lock sequencing: block starting a quiz while an earlier required track is unfinished.
        siblings = await self.assignment_dao.list_for_employee(org_id, assignment.employee_id)
        locked, locked_by = self._compute_locks(siblings).get(assignment.id, (False, None))
        if locked:
            raise ForbiddenError(f"Finish '{locked_by}' before starting this track")
        if assignment.status in (PackAssignmentStatus.assigned, PackAssignmentStatus.reading):
            raise ForbiddenError("Acknowledge every document before starting the quiz (Doc Pack PRD §4)")
        if assignment.quiz_template_id is None:
            raise ValidationError("This pack has no published quiz yet")

        template = await self.template_dao.get_with_questions(assignment.quiz_template_id)
        if template is None:
            raise NotFoundError("Quiz template not found")

        # Resume an open attempt instead of minting a new one (and avoid a second round-trip commit).
        if assignment.status == PackAssignmentStatus.quiz_in_progress:
            open_attempt = await self.attempt_dao.get_open_for_employee_template(
                assignment.employee_id, assignment.quiz_template_id
            )
            if open_attempt is not None:
                return open_attempt, template

        now = datetime.now(UTC)
        attempt = QuizAttempt(
            employee_id=assignment.employee_id,
            quiz_template_id=assignment.quiz_template_id,
            started_at=now,
        )
        self.session.add(attempt)
        assignment.status = PackAssignmentStatus.quiz_in_progress
        await self.session.commit()
        await self.session.refresh(attempt)
        return attempt, template
