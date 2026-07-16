from pydantic import BaseModel


class ComputeExpertiseRequest(BaseModel):
    repo_id: str


class ComputeBusFactorRequest(BaseModel):
    repo_id: str
