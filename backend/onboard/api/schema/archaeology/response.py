from pydantic import BaseModel


class SourceCitation(BaseModel):
    file_path: str
    commit_sha: str | None = None
    summary: str


class ExpertReferral(BaseModel):
    contributor_name: str
    evidence: list[str] = []
    draft_message: str | None = None


class AnswerResponse(BaseModel):
    answer: str
    citations: list[SourceCitation] = []
    # 0..1 — how well the retrieved context supports the answer. Below the threshold we don't guess.
    confidence: float
    # True when the system wasn't confident and handed off to a human instead (PRD §6.4/§7).
    escalated: bool = False
    expert: ExpertReferral | None = None
