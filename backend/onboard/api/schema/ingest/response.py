from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IngestSummaryResponse(BaseModel):
    """What a single ingest push wrote — surfaced in the Action logs and the connect-repo UI."""

    repo_id: str
    contributors_upserted: int
    commits_written: int
    files_written: int
    chunks_written: int
    ingested_at: datetime


class IngestKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    repo_id: str
    key_prefix: str
    last_used_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime
    # Plaintext token — populated ONLY in the create response, never on list. Show it once.
    token: str | None = None
