from datetime import datetime

from pydantic import BaseModel, Field

from onboard.config.constants import (
    INGEST_MAX_CHUNKS,
    INGEST_MAX_COMMITS,
    INGEST_MAX_CONTRIBUTORS,
    INGEST_MAX_FILES,
)


class IngestRepoMeta(BaseModel):
    name: str
    default_branch: str | None = None
    head_sha: str | None = None


class IngestContributor(BaseModel):
    name: str
    email: str | None = None
    handle: str | None = None


class IngestCommit(BaseModel):
    hash: str
    message: str
    # Join key back to a contributor (an email, or whatever identity key the extractor used).
    author_email: str | None = None
    committed_at: datetime
    linked_issue: str | None = None


class IngestFileExpertise(BaseModel):
    file_path: str
    author_email: str | None = None
    commit_count: int = 0
    review_count: int = 0
    revert_count: int = 0
    last_commit_at: datetime | None = None


class IngestCodeChunk(BaseModel):
    file_path: str
    content: str
    start_line: int | None = None
    end_line: int | None = None


class IngestPayload(BaseModel):
    """Full metadata snapshot pushed by the customer's GitHub Action.

    Every ingest is a complete replacement of the repo's derived graph — the extractor sends the
    current state, and the backend swaps it in transactionally. List sizes are capped so a single
    request can't exhaust the 512MB host (rejected with 422 before any DB work).
    """

    repo: IngestRepoMeta
    contributors: list[IngestContributor] = Field(default_factory=list, max_length=INGEST_MAX_CONTRIBUTORS)
    commits: list[IngestCommit] = Field(default_factory=list, max_length=INGEST_MAX_COMMITS)
    file_expertise: list[IngestFileExpertise] = Field(default_factory=list, max_length=INGEST_MAX_FILES)
    code_chunks: list[IngestCodeChunk] = Field(default_factory=list, max_length=INGEST_MAX_CHUNKS)
