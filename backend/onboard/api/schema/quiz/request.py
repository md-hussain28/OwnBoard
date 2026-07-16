from pydantic import BaseModel


class GenerateCodebaseQuizRequest(BaseModel):
    repo_id: str
    custom_instructions: str | None = None


class GeneratePolicyQuizRequest(BaseModel):
    policy_doc_id: str
    custom_instructions: str | None = None


class GradeAttemptRequest(BaseModel):
    answers: dict[str, str]
