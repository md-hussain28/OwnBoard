from pydantic import BaseModel, ConfigDict


class OrgDomainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str
    name: str
    is_default: bool
