from pydantic import BaseModel


class ExpertRoutingResponse(BaseModel):
    contributor_id: str
    contributor_name: str
    confidence: float
