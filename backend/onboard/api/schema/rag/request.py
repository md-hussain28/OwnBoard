from pydantic import BaseModel


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
