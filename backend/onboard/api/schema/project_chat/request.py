from pydantic import BaseModel


class AskProjectRequest(BaseModel):
    question: str
