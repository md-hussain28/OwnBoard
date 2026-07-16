from sqlalchemy.ext.asyncio import AsyncSession


class QuizService:
    """Scenario-based quiz generation and grading (PRD §6.3/§6.5/§6.7)."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def generate_codebase_quiz(self, repo_id: str, custom_instructions: str | None = None):
        raise NotImplementedError("generate_codebase_quiz is not implemented yet")

    async def generate_policy_quiz(self, policy_doc_id: str, custom_instructions: str | None = None):
        raise NotImplementedError("generate_policy_quiz is not implemented yet")

    async def grade_attempt(self, quiz_attempt_id: str, answers: dict[str, str]):
        raise NotImplementedError("grade_attempt is not implemented yet")
