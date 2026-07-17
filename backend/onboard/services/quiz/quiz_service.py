import asyncio
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import APP_ROLE_ADMIN, QUIZ_LLM_CONCURRENCY
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.doc_chunk_dao import DocChunkContent, DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.models.doc_pack import DocPackStatus, DocumentStatus, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.quiz_attempt import QuizAttempt
from onboard.dao.models.quiz_question import QuestionFormat, QuizQuestion
from onboard.dao.models.quiz_template import QuizTemplate, QuizType
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.quiz_attempt_dao import QuizAttemptDAO
from onboard.dao.quiz_question_dao import QuizQuestionDAO
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.quiz.generation_graph import (
    ChunkForPlanning,
    DocumentForPlanning,
    RejectedSlot,
    VerifiedQuestion,
    plan_coverage,
    run_generation_graph,
    run_regeneration_graph,
)


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
        self, org_id: str, pack_id: str, curation: list[dict], *, open_book: bool = False
    ) -> QuizTemplate:
        """Publish the admin's curated question set (Doc Pack PRD §5.5/§5.6, E1 §10.12)."""
        pack = await self.doc_pack_dao.get_by_id_for_org(org_id, pack_id)
        if pack is None:
            raise NotFoundError(f"Doc pack {pack_id} not found")

        draft = await self.template_dao.get_latest_for_source(pack_id, QuizType.doc_pack)
        if draft is None or draft.is_published:
            raise ValidationError("No unpublished quiz draft to save — generate a quiz first")

        by_id = {q.id: q for q in draft.questions}
        keep_ids = {item["id"] for item in curation}
        missing = keep_ids - by_id.keys()
        if missing:
            raise NotFoundError(f"Question(s) not found in the current draft: {', '.join(sorted(missing))}")

        drop_ids = [q.id for q in draft.questions if q.id not in keep_ids]
        if drop_ids:
            await self.question_dao.delete_many(drop_ids)

        for item in curation:
            question = by_id[item["id"]]
            fields = {
                "question_text": item["question_text"],
                "options": item["options"],
                "correct_answer": item["correct_answer"],
                "source_citation": item.get("source_citation") or question.source_citation,
            }
            if item.get("format"):
                fields["format"] = QuestionFormat(item["format"])
            await self.question_dao.update(question.id, **fields)

        await self.template_dao.update(draft.id, is_published=True, open_book=open_book)
        await self.pack_assignment_dao.repoint_pending_assignments(pack_id, draft.id)
        await self.doc_pack_dao.update(pack.id, status=DocPackStatus.active, review_note=None)

        refreshed = await self.template_dao.get_with_questions(draft.id)
        assert refreshed is not None
        return refreshed

    # -- Grading (reused across policy/codebase/doc_pack quiz types — PRD §6.7) ---------------------------

    async def grade_attempt(
        self,
        org_id: str,
        quiz_attempt_id: str,
        answers: dict[str, str],
        *,
        actor: Employee | None = None,
    ) -> QuizAttempt:
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

        correct = sum(
            1
            for question in questions
            if (given := answers.get(question.id)) is not None
            and given.strip().lower() == question.correct_answer.strip().lower()
        )
        score = correct / len(questions)
        passed = score >= 1.0  # Doc Pack PRD §10.6 — pass bar is 100%, no partial credit.

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

        return updated
