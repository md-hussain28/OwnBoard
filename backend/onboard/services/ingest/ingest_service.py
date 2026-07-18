"""Push-model ingestion: receive a git-metadata snapshot and swap in the repo's derived graph.

This is the backend half of the design that keeps OwnBoard runnable on a 512MB / 0.1-CPU host: the
heavy extraction runs in the customer's GitHub Action (PRD §6.1, re-cast as push instead of clone),
and this service does only thin, bounded writes. Embedding is deliberately NOT done here — code
chunks land with `embedding = NULL` and are backfilled off-dyno by `onboard.jobs.embed_pending`.

Each ingest is a full replacement: the extractor sends the current state and we transactionally
delete-then-insert, so re-running the Action is idempotent.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.config.constants import (
    EXPERTISE_HALF_LIFE_DAYS,
    EXPERTISE_REVERT_PENALTY,
    INGEST_MAX_CHUNK_CHARS,
)
from onboard.core.common.exceptions import NotFoundError
from onboard.core.common.ingest_token import generate_ingest_token
from onboard.dao.code_chunk_dao import CodeChunkDAO
from onboard.dao.commit_record_dao import CommitRecordDAO
from onboard.dao.contributor_dao import ContributorDAO
from onboard.dao.file_expertise_dao import FileExpertiseDAO
from onboard.dao.ingest_key_dao import IngestKeyDAO
from onboard.dao.models.code_chunk import CodeChunk
from onboard.dao.models.commit_record import CommitRecord
from onboard.dao.models.contributor import Contributor
from onboard.dao.models.file_expertise import FileExpertise
from onboard.dao.models.ingest_key import IngestKey
from onboard.dao.repo_dao import RepoDAO

_UNKNOWN_KEY = "__unknown__"


def _aware(dt: datetime) -> datetime:
    """Treat naive timestamps as UTC so arithmetic against `now(UTC)` never raises."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _recency_decay(last_commit_at: datetime | None, now: datetime) -> float:
    """Exponential decay with a fixed half-life — recent work weighs more (PRD §6.2)."""
    if last_commit_at is None:
        return 0.5
    age_days = max(0.0, (now - _aware(last_commit_at)).total_seconds() / 86_400.0)
    return 0.5 ** (age_days / EXPERTISE_HALF_LIFE_DAYS)


def _revert_penalty(revert_count: int) -> float:
    return max(0.2, 1.0 - EXPERTISE_REVERT_PENALTY * max(0, revert_count))


def _expertise_score(commit_count: int, review_count: int, revert_count: int, last_commit_at, now) -> float:
    # Reviews count as half a commit's worth of signal (PRD §6.2 — review activity counted alongside commits).
    base = commit_count + 0.5 * review_count
    return round(base * _recency_decay(last_commit_at, now) * _revert_penalty(revert_count), 4)


class IngestService:
    """Ingest-key lifecycle + the `POST /ingest` write path (PRD §6.1, push variant)."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo_dao = RepoDAO(session)
        self.ingest_key_dao = IngestKeyDAO(session)
        self.contributor_dao = ContributorDAO(session)
        self.commit_dao = CommitRecordDAO(session)
        self.file_expertise_dao = FileExpertiseDAO(session)
        self.code_chunk_dao = CodeChunkDAO(session)

    # ---- ingest-key management (Clerk-authenticated admin) --------------------------------------

    async def _require_repo(self, org_id: str, repo_id: str):
        repo = await self.repo_dao.get_by_id_for_org(org_id, repo_id)
        if repo is None:
            raise NotFoundError(f"Repo {repo_id} not found")
        return repo

    async def create_key(self, org_id: str, repo_id: str) -> tuple[IngestKey, str]:
        """Mint a new ingest key for a repo. Returns (row, plaintext) — plaintext shown once."""
        await self._require_repo(org_id, repo_id)
        raw, key_hash, prefix = generate_ingest_token()
        key = await self.ingest_key_dao.create(org_id=org_id, repo_id=repo_id, key_hash=key_hash, key_prefix=prefix)
        return key, raw

    async def list_keys(self, org_id: str, repo_id: str) -> list[IngestKey]:
        await self._require_repo(org_id, repo_id)
        return await self.ingest_key_dao.list_for_repo(org_id, repo_id)

    async def revoke_key(self, org_id: str, key_id: str) -> IngestKey:
        key = await self.ingest_key_dao.get_for_org(org_id, key_id)
        if key is None:
            raise NotFoundError(f"Ingest key {key_id} not found")
        if key.revoked_at is None:
            key = await self.ingest_key_dao.update(key_id, revoked_at=datetime.now(UTC))
        return key

    # ---- the push write path (ingest-key authenticated) -----------------------------------------

    async def ingest_metadata(self, org_id: str, repo_id: str, payload) -> dict:
        """Replace the repo's contributor/commit/expertise/chunk graph from a pushed snapshot."""
        await self._require_repo(org_id, repo_id)
        now = datetime.now(UTC)

        # 1. Clear the prior snapshot (children first; all within this one transaction).
        await self.code_chunk_dao.delete_for_repo(repo_id)
        await self.commit_dao.delete_for_repo(repo_id)
        await self.file_expertise_dao.delete_for_repo(repo_id)
        await self.contributor_dao.delete_for_repo(repo_id)

        # 2. Materialise contributors, keyed by a stable identity (email → handle → name).
        contributors_by_key: dict[str, Contributor] = {}

        def ensure_contributor(key: str | None, *, name: str, email: str | None, handle: str | None) -> None:
            resolved = key or _UNKNOWN_KEY
            if resolved in contributors_by_key:
                return
            contributors_by_key[resolved] = Contributor(
                repo_id=repo_id,
                name=name or resolved,
                email=email,
                github_handle=handle,
            )

        for c in payload.contributors:
            ensure_contributor(c.email or c.handle or c.name, name=c.name, email=c.email, handle=c.handle)
        # Any author referenced by commits/files but absent from the contributor list gets a stub.
        for cm in payload.commits:
            ensure_contributor(cm.author_email, name=cm.author_email or "Unknown", email=cm.author_email, handle=None)
        for fe in payload.file_expertise:
            ensure_contributor(fe.author_email, name=fe.author_email or "Unknown", email=fe.author_email, handle=None)

        self.session.add_all(list(contributors_by_key.values()))
        await self.session.flush()  # populate contributor ids for FK linking below

        def contributor_id_for(key: str | None) -> str:
            return contributors_by_key[key if key in contributors_by_key else _UNKNOWN_KEY].id

        # 3. Commits (provenance for archaeology mode).
        commits = [
            CommitRecord(
                repo_id=repo_id,
                hash=cm.hash,
                message=cm.message,
                author_id=contributor_id_for(cm.author_email),
                committed_at=cm.committed_at,
                linked_issue=cm.linked_issue,
            )
            for cm in payload.commits
        ]

        # 4. Per-file expertise, with the recency/revert-adjusted score computed deterministically here.
        files = [
            FileExpertise(
                repo_id=repo_id,
                file_path=fe.file_path,
                contributor_id=contributor_id_for(fe.author_email),
                commit_count=fe.commit_count,
                review_count=fe.review_count,
                revert_adjusted_score=_expertise_score(
                    fe.commit_count, fe.review_count, fe.revert_count, fe.last_commit_at, now
                ),
                last_commit_at=fe.last_commit_at,
            )
            for fe in payload.file_expertise
        ]

        # 5. Code chunks for RAG — stored now, embedded later off-dyno.
        chunks = [
            CodeChunk(
                repo_id=repo_id,
                file_path=ch.file_path,
                content=ch.content[:INGEST_MAX_CHUNK_CHARS],
                embedding=None,
            )
            for ch in payload.code_chunks
            if ch.content.strip()
        ]

        self.session.add_all(commits)
        self.session.add_all(files)
        self.session.add_all(chunks)

        # 6. Stamp ingestion time and commit the whole snapshot atomically.
        repo = await self.repo_dao.get_by_id_for_org(org_id, repo_id)
        repo.ingested_at = now
        await self.session.commit()

        return {
            "repo_id": repo_id,
            "contributors_upserted": len(contributors_by_key),
            "commits_written": len(commits),
            "files_written": len(files),
            "chunks_written": len(chunks),
            "ingested_at": now,
        }
