from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RepoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    name: str
    ingested_at: datetime | None
    created_at: datetime
    updated_at: datetime
