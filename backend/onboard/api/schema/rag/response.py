from pydantic import BaseModel


class RetrievedChunkResponse(BaseModel):
    file_path: str
    content: str
    score: float


class RetrieveResponse(BaseModel):
    chunks: list[RetrievedChunkResponse]
