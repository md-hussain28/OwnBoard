from datetime import datetime

from pydantic import BaseModel


class ExpertiseScoreResponse(BaseModel):
    file_path: str
    contributor_id: str
    contributor_name: str
    commit_count: int
    review_count: int
    revert_adjusted_score: float
    last_commit_at: datetime | None


class BusFactorResponse(BaseModel):
    file_path: str
    risk_level: str
    top_contributor_ids: list[str]
