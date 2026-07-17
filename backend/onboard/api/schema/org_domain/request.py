from pydantic import BaseModel, Field


class OrgDomainCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class OrgDomainUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
