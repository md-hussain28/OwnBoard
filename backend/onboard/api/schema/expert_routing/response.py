from pydantic import BaseModel


class ExpertRoutingResponse(BaseModel):
    contributor_id: str
    contributor_name: str
    confidence: float
    # Deterministic, evidence-first justification (PRD §6.6) — why this person, in plain bullets.
    evidence: list[str] = []
    # LLM-drafted introduction the new hire can send. Best-effort; None when the LLM is unavailable.
    draft_message: str | None = None
    backup_contributor_name: str | None = None
