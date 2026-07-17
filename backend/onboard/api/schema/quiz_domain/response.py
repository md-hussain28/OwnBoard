from pydantic import BaseModel, ConfigDict


class QuizDomainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
    is_default: bool
