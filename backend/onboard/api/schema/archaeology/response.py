from pydantic import BaseModel


class AnswerResponse(BaseModel):
    answer: str
    citations: list[str]
