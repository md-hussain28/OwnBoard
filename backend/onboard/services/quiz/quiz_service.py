import asyncio
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import APP_ROLE_ADMIN, QUIZ_LLM_CONCURRENCY
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.doc_chunk_dao import DocChunkContent, DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.models.doc_pack import DocPackStatus, DocumentStatus, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.notification import NotificationType
from onboard.dao.models.quiz_attempt import QuizAttempt
from onboard.dao.models.quiz_question import QuestionFormat, QuizQuestion
from onboard.dao.models.quiz_template import QuizTemplate, QuizType
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.quiz_attempt_dao import QuizAttemptDAO
from onboard.dao.quiz_question_dao import QuizQuestionDAO
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.notification.notification_service import NotificationService
from onboard.services.quiz.generation import (
    ChunkForPlanning,
    DocumentForPlanning,
    RejectedSlot,
    VerifiedQuestion,
    plan_coverage,
    run_generation_graph,
    run_regeneration_graph,
)


def _stored_correct_answer(fmt: QuestionFormat | None, correct_answer: str | list[str]) -> str:
    """Serialize a curated answer for storage. multi_select → JSON array of option texts; else the
    single option text (a list is collapsed to its first entry for single-select formats)."""
    if fmt == QuestionFormat.multi_select:
        values = correct_answer if isinstance(correct_answer, list) else [correct_answer]
        cleaned = [str(v) for v in values if str(v).strip()]
        return json.dumps(cleaned)
    if isinstance(correct_answer, list):
        return str(correct_answer[0]) if correct_answer else ""
    return str(correct_answer)


@dataclass
class QuestionGradeResult:
    question_id: str
    question_text: str
    correct: bool
    source_citation: str | None = None


@dataclass
class GradeResult:
    attempt: QuizAttempt
    score: float
    passed: bool
    pass_pct: int
    correct_count: int
    total_count: int
    results: list[QuestionGradeResult] = field(default_factory=list)


def _grade_question(question: QuizQuestion, given: str | list[str] | None) -> bool:
    """True if `given` matches the stored correct answer. multi_select is exact set-match."""
    if given is None:
        return False
    if question.format == QuestionFormat.multi_select:
        try:
            parsed = json.loads(question.correct_answer)
        except (ValueError, TypeError):
            parsed = [question.correct_answer]
        correct_set = {str(c).strip().lower() for c in (parsed if isinstance(parsed, list) else [parsed])}
        given_list = given if isinstance(given, list) else [given]
        given_set = {str(g).strip().lower() for g in given_list}
        return bool(correct_set) and given_set == correct_set
    given_value = given[0] if isinstance(given, list) and given else given
    if not isinstance(given_value, str):
        return False
    return given_value.strip().lower() == question.correct_answer.strip().lower()


class QuizService:
    """Scenario-based quiz generation and grading (PRD §6.3/§6.5/§6.7, Doc Pack PRD §5/§6)."""

    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.template_dao = QuizTemplateDAO(session)
        self.question_dao = QuizQuestionDAO(session)
        self.attempt_dao = QuizAttemptDAO(session)
        self.doc_pack_dao = DocPackDAO(session)
        self.chunk_dao = DocChunkDAO(session)
        self.pack_assignment_dao = PackAssignmentDAO(session)

    async def generate_codebase_quiz(self, repo_id: str, custom_instructions: str | None = None):
        raise NotImplementedError("generate_codebase_quiz is not implemented yet")

    async def generate_policy_quiz(self, policy_doc_id: str, custom_instructions: str | None = None):
        raise NotImplementedError("generate_policy_quiz is not implemented yet")

    # -- Doc Pack quiz generation pipeline (Doc Pack PRD §5) -----------------------------------------------

    async def generate_doc_pack_quiz(
        self,
        org_id: str,
        pack_id: str,
        target_count: int,
        formats: list[str],
        custom_instructions: str | None,
    ) -> tuple[QuizTemplate, list[RejectedSlot]]:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")

        processed_docs = [d for d in pack.documents if d.status == DocumentStatus.processed]
        if not processed_docs:
            raise ValidationError("No processed documents in this pack yet — wait for ingestion to finish")

        chunks_by_doc = await self._chunks_by_document(org_id, pack_id)

        documents_for_planning = [
            DocumentForPlanning(
                document_id=doc.id,
                title=doc.title,
                chunks=[
                    ChunkForPlanning(
                        chunk_index=c.chunk_index, content=c.content, page_start=c.page_start, page_end=c.page_end
                    )
                    for c in chunks_by_doc.get(doc.id, [])
                ],
            )
            for doc in processed_docs
        ]
        if not any(doc.chunks for doc in documents_for_planning):
            raise ValidationError("Processed documents have no ingested content to generate questions from")

        accepted, rejected = await run_generation_graph(
            self.llm, documents_for_planning, target_count, formats, custom_instructions
        )
        if not accepted:
            raise ValidationError("Could not generate any verifiable questions from this pack's documents")

        # A fresh generate call replaces any prior unpublished curation draft — only one "in progress" at a time.
        previous_draft = await self.template_dao.get_latest_for_source(pack_id, QuizType.doc_pack)
        if previous_draft is not None and not previous_draft.is_published:
            await self.question_dao.delete_for_template(previous_draft.id)
            await self.template_dao.delete(previous_draft.id)

        template = await self.template_dao.create(
            type=QuizType.doc_pack,
            source_ref=pack_id,
            custom_instructions=custom_instructions,
            is_published=False,
            open_book=False,
        )
        await self.question_dao.bulk_create(
            [
                {
                    "quiz_template_id": template.id,
                    "question_text": vq.drafted.question_text,
                    "options": vq.drafted.options,
                    "correct_answer": vq.drafted.correct_answer,
                    "source_citation": vq.slot.citation,
                    "format": vq.slot.format,
                    "source_document_id": vq.slot.document_id,
                }
                for vq in accepted
            ]
        )

        if rejected:
            note = "; ".join(f"{r.slot.document_title} ({r.slot.citation}): {r.reason}" for r in rejected)
            await self.doc_pack_dao.update(pack.id, status=DocPackStatus.needs_review, review_note=note[:4000])
        elif pack.status == DocPackStatus.needs_review:
            await self.doc_pack_dao.update(pack.id, status=DocPackStatus.draft, review_note=None)

        refreshed = await self.template_dao.get_with_questions(template.id)
        assert refreshed is not None
        return refreshed, rejected

    async def regenerate_questions(self, org_id: str, pack_id: str, question_ids: list[str]) -> QuizTemplate:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")

        draft = await self.template_dao.get_latest_for_source(pack_id, QuizType.doc_pack)
        if draft is None or draft.is_published:
            raise ValidationError("No unpublished quiz draft to regenerate questions on — generate a quiz first")

        by_id = {q.id: q for q in draft.questions}
        targets = []
        for question_id in question_ids:
            question = by_id.get(question_id)
            if question is None:
                raise NotFoundError(f"Question {question_id} not found in the current draft")
            targets.append(question)

        chunks_by_doc = await self._chunks_by_document(org_id, pack_id)
        avoid = [q.question_text for q in draft.questions if q.id not in question_ids]
        failures: list[str] = []

        async def regenerate_one(question: QuizQuestion) -> tuple[QuizQuestion, VerifiedQuestion | None, str | None]:
            document_id = question.source_document_id
            document = next((d for d in pack.documents if d.id == document_id), None)
            if document is None or not chunks_by_doc.get(document_id):
                return question, None, f"{question.id}: source document no longer has ingested content"

            planning_doc = DocumentForPlanning(
                document_id=document.id,
                title=document.title,
                chunks=[
                    ChunkForPlanning(
                        chunk_index=c.chunk_index, content=c.content, page_start=c.page_start, page_end=c.page_end
                    )
                    for c in chunks_by_doc[document_id]
                ],
            )
            fmt = question.format or QuestionFormat.mcq_4
            slots = plan_coverage([planning_doc], 1, [fmt.value])
            if not slots:
                return question, None, f"{question.id}: could not plan a replacement slot"

            replacement = await run_regeneration_graph(self.llm, slots[0], draft.custom_instructions, avoid)
            if replacement is None:
                return question, None, f"{question.id}: could not draft a verifiable replacement"
            return question, replacement, None

        sem = asyncio.Semaphore(max(1, QUIZ_LLM_CONCURRENCY))

        async def guarded(question: QuizQuestion):
            async with sem:
                return await regenerate_one(question)

        results = await asyncio.gather(*(guarded(q) for q in targets))

        for question, replacement, failure in results:
            if failure is not None or replacement is None:
                failures.append(failure or f"{question.id}: could not draft a verifiable replacement")
                continue

            await self.question_dao.delete_many([question.id])
            await self.question_dao.bulk_create(
                [
                    {
                        "quiz_template_id": draft.id,
                        "question_text": replacement.drafted.question_text,
                        "options": replacement.drafted.options,
                        "correct_answer": replacement.drafted.correct_answer,
                        "source_citation": replacement.slot.citation,
                        "format": replacement.slot.format,
                        "source_document_id": replacement.slot.document_id,
                    }
                ]
            )
            avoid.append(replacement.drafted.question_text)

        if failures:
            raise ValidationError("Some questions could not be regenerated: " + "; ".join(failures))

        refreshed = await self.template_dao.get_with_questions(draft.id)
        assert refreshed is not None
        return refreshed

    async def _chunks_by_document(self, org_id: str, pack_id: str) -> dict[str, list[DocChunkContent]]:
        chunks_by_doc: dict[str, list[DocChunkContent]] = {}
        for chunk in await self.chunk_dao.list_content_for_pack(org_id, pack_id):
            chunks_by_doc.setdefault(chunk.document_id, []).append(chunk)
        return chunks_by_doc

    async def get_admin_quiz(self, org_id: str, pack_id: str) -> QuizTemplate:
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")
        template = await self.template_dao.get_latest_for_source(pack_id, QuizType.doc_pack)
        if template is None:
            raise NotFoundError("No quiz has been generated for this pack yet")
        return template

    async def save_curated_quiz(
        self, org_id: str, pack_id: str, curation: list[dict], *, open_book: bool = False, pass_pct: int = 100
    ) -> QuizTemplate:
        """Publish (or re-publish) the admin's curated question set (Doc Pack PRD §5.5/§5.6, E1 §10.12).

        The curation list is the full desired question set: items whose id matches an existing question
        are edited in place, items with an unknown id (e.g. a client temp id) are created as manually
        authored questions, and existing questions absent from the list are dropped. Works on both an
        unpublished draft and an already-published quiz, so admins can keep editing after go-live.
        """
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")

        template = await self.template_dao.get_latest_for_source(pack_id, QuizType.doc_pack)
        if template is None:
            raise ValidationError("No quiz to save — generate a quiz first")

        by_id = {q.id: q for q in template.questions}
        keep_ids = {item["id"] for item in curation if item["id"] in by_id}

        drop_ids = [q.id for q in template.questions if q.id not in keep_ids]
        if drop_ids:
            await self.question_dao.delete_many(drop_ids)

        for item in curation:
            fmt = QuestionFormat(item["format"]) if item.get("format") else None
            stored_answer = _stored_correct_answer(fmt, item["correct_answer"])
            if not stored_answer:
                raise ValidationError(f"Question '{item['question_text'][:48]}' needs a correct answer")

            existing = by_id.get(item["id"])
            if existing is not None:
                fields: dict = {
                    "question_text": item["question_text"],
                    "options": item["options"],
                    "correct_answer": stored_answer,
                    "source_citation": item.get("source_citation") or existing.source_citation,
                }
                if fmt is not None:
                    fields["format"] = fmt
                await self.question_dao.update(existing.id, **fields)
            else:
                await self.question_dao.bulk_create(
                    [
                        {
                            "quiz_template_id": template.id,
                            "question_text": item["question_text"],
                            "options": item["options"],
                            "correct_answer": stored_answer,
                            "source_citation": item.get("source_citation"),
                            "format": fmt or QuestionFormat.mcq_4,
                            "source_document_id": None,
                        }
                    ]
                )

        await self.template_dao.update(template.id, is_published=True, open_book=open_book)
        await self.pack_assignment_dao.repoint_pending_assignments(pack_id, template.id)
        await self.doc_pack_dao.update(pack.id, status=DocPackStatus.active, review_note=None, pass_pct=pass_pct)

        refreshed = await self.template_dao.get_with_questions(template.id)
        assert refreshed is not None
        return refreshed

    # -- Grading (reused across policy/codebase/doc_pack quiz types — PRD §6.7) ---------------------------

    async def grade_attempt(
        self,
        org_id: str,
        quiz_attempt_id: str,
        answers: dict[str, str | list[str]],
        *,
        actor: Employee | None = None,
    ) -> GradeResult:
        attempt = await self.attempt_dao.get_by_id_for_org(org_id, quiz_attempt_id)
        if attempt is None:
            raise NotFoundError(f"Quiz attempt {quiz_attempt_id} not found")
        if actor is not None and actor.app_role != APP_ROLE_ADMIN and attempt.employee_id != actor.id:
            raise ForbiddenError("You can only grade your own quiz attempts")
        if attempt.completed_at is not None:
            raise ValidationError("This attempt has already been graded")

        questions = await self.question_dao.list_for_template(attempt.quiz_template_id)
        if not questions:
            raise ValidationError("Quiz template has no questions")

        results = [
            QuestionGradeResult(
                question_id=q.id,
                question_text=q.question_text,
                correct=_grade_question(q, answers.get(q.id)),
                source_citation=q.source_citation,
            )
            for q in questions
        ]
        correct = sum(1 for r in results if r.correct)
        total = len(questions)
        score = correct / total

        # Configurable pass bar (Doc Pack PRD §10.6) — the pack's `pass_pct`, defaulting to 100%. Integer
        # comparison avoids float rounding (e.g. 2/3 vs a 66% bar).
        pack = None
        pass_pct = 100
        template = await self.template_dao.get_by_id(attempt.quiz_template_id)
        if template is not None:
            pack = await self.doc_pack_dao.get_by_id_for_org(org_id, template.source_ref)
            if pack is not None:
                pass_pct = pack.pass_pct
        passed = correct * 100 >= pass_pct * total

        now = datetime.now(UTC)
        updated = await self.attempt_dao.update(attempt.id, score=score, passed=passed, completed_at=now)
        assert updated is not None

        # If this attempt belongs to a Doc Pack assignment, advance its state machine (Doc Pack PRD §4).
        assignment = await self.pack_assignment_dao.get_active_for_quiz_template(
            attempt.quiz_template_id, attempt.employee_id
        )
        if assignment is not None:
            next_status = PackAssignmentStatus.passed if passed else PackAssignmentStatus.failed
            fields: dict = {"status": next_status}
            if passed:
                fields["completed_at"] = now
            await self.pack_assignment_dao.update(assignment.id, **fields)

            # Outcome notification for the employee (Track PRD §notifications).
            pack_name = pack.name if pack is not None else "your quiz"
            if passed:
                title = f"Passed: {pack_name} ✓"
                body = f"You scored {round(score * 100)}% and cleared this track."
            else:
                title = f"Not passed yet: {pack_name}"
                body = f"You scored {round(score * 100)}% (need {pass_pct}%). Review the missed topics and retake it."
            await NotificationService(self.session).emit(
                org_id,
                attempt.employee_id,
                NotificationType.outcome,
                title,
                body=body,
                link=f"/app/onboarding/packs/{assignment.id}",
            )

        return GradeResult(
            attempt=updated,
            score=score,
            passed=passed,
            pass_pct=pass_pct,
            correct_count=correct,
            total_count=total,
            results=results,
        )
