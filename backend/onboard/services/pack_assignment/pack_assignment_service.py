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


@dataclass
class AssignmentDetail:
    assignment: PackAssignment
    doc_pack_name: str
    documents: list[tuple[DocPackDocument, datetime | None]]
    quiz_unlocked: bool


@dataclass
class DocumentContent:
    document_id: str
    title: str
    file_type: str
    content: str
    file_url: str | None = None


class PackAssignmentService:
    """Doc Pack assignment read-gate → open-book quiz state machine (Doc Pack PRD §4/§6)."""

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

    async def get_document_content(
        self, org_id: str, assignment_id: str, document_id: str, *, actor: Employee
    ) -> DocumentContent:
        """Open-book reading text for one document in an assignment (Doc Pack PRD §4 read-gate)."""
        assignment = await self.assignment_dao.get_by_id_for_org(org_id, assignment_id)
        if assignment is None:
            raise NotFoundError(f"Assignment {assignment_id} not found")
        self.assert_can_access_assignment(assignment, actor)

        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, assignment.doc_pack_id)
        assert pack is not None
        document = next((doc for doc in pack.documents if doc.id == document_id), None)
        if document is None:
            raise NotFoundError(f"Document {document_id} not in this assignment's pack")

        storage = await self._storage_client()
        raw = await storage.download(document.storage_path)
        extracted = extract_document(raw, document.file_type)
        # Signed URL lets the employee viewer embed the original PDF (not just extracted text).
        file_url = await storage.signed_url(document.storage_path, expires_in_seconds=3600)
        return DocumentContent(
            document_id=document.id,
            title=document.title,
            file_type=document.file_type,
            content=extracted.full_text,
            file_url=file_url,
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
            )
            # New rows have no acks; mark loaded so response serialization doesn't
            # lazy-load (async MissingGreenlet / 500).
            set_committed_value(assignment, "acks", [])
            created.append(assignment)
        return created

    async def list_for_pack(self, org_id: str, pack_id: str) -> list[PackAssignment]:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")
        return await self.assignment_dao.list_for_pack(org_id, pack_id)

    async def list_for_employee(
        self, org_id: str, employee_id: str, *, actor: Employee
    ) -> list[tuple[PackAssignment, str]]:
        """Return (assignment, doc_pack_name) pairs the actor is allowed to see."""
        if actor.app_role != APP_ROLE_ADMIN and actor.id != employee_id:
            raise ForbiddenError("You can only list your own assignments")
        employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
        if employee is None:
            raise NotFoundError(f"Employee {employee_id} not found")
        assignments = await self.assignment_dao.list_for_employee(org_id, employee_id)
        return [
            (assignment, assignment.doc_pack.name if assignment.doc_pack else "Doc pack") for assignment in assignments
        ]

    async def list_recent_outcomes(self, org_id: str, *, limit: int = 50) -> list[PackAssignment]:
        """Org-admin inbox of recent quiz pass/fail outcomes."""
        return await self.assignment_dao.list_recent_outcomes(org_id, limit=limit)

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

        return AssignmentDetail(
            assignment=assignment, doc_pack_name=pack.name, documents=documents, quiz_unlocked=quiz_unlocked
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
        if assignment.status in (PackAssignmentStatus.assigned, PackAssignmentStatus.reading):
            raise ForbiddenError("Acknowledge every document before starting the quiz (Doc Pack PRD §4)")
        if assignment.quiz_template_id is None:
            raise ValidationError("This pack has no published quiz yet")

        template = await self.template_dao.get_with_questions(assignment.quiz_template_id)
        if template is None:
            raise NotFoundError("Quiz template not found")

        now = datetime.now(UTC)
        attempt = await self.attempt_dao.create(
            employee_id=assignment.employee_id, quiz_template_id=assignment.quiz_template_id, started_at=now
        )
        await self.assignment_dao.update(assignment.id, status=PackAssignmentStatus.quiz_in_progress)
        return attempt, template
