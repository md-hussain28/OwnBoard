from typing import Literal

from pydantic import BaseModel


class AskHistoryTurn(BaseModel):
    """A prior conversation turn, for multi-turn follow-ups. Assistant content is its text only."""

    role: Literal["user", "assistant"]
    content: str


class AskProjectRequest(BaseModel):
    question: str
    history: list[AskHistoryTurn] = []
