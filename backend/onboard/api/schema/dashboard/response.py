from pydantic import BaseModel


class FileBusFactorResponse(BaseModel):
    file_path: str
    risk_level: str
    top_contributor_ids: list[str]


class BusFactorHeatmapResponse(BaseModel):
    repo_id: str
    files: list[FileBusFactorResponse]


class QuizAnalyticsResponse(BaseModel):
    repo_id: str
    total_attempts: int
    pass_rate: float
    average_score: float
