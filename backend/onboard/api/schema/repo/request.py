from pydantic import BaseModel


class RepoCreateRequest(BaseModel):
    url: str
    name: str
