from datetime import UTC, datetime

from sqlalchemy import select

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.ingest_key import IngestKey


class IngestKeyDAO(BaseDAO[IngestKey]):
    model = IngestKey

    async def get_active_by_hash(self, key_hash: str) -> IngestKey | None:
        """Look up a non-revoked key by its hash — the ingest endpoint's auth path."""
        result = await self.session.execute(
            select(IngestKey).where(IngestKey.key_hash == key_hash, IngestKey.revoked_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def has_active_for_repo(self, org_id: str, repo_id: str) -> bool:
        """Whether the repo already has a non-revoked key — enforces the one-active-key rule cheaply."""
        result = await self.session.execute(
            select(IngestKey.id)
            .where(
                IngestKey.org_id == org_id,
                IngestKey.repo_id == repo_id,
                IngestKey.revoked_at.is_(None),
            )
            .limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def list_for_repo(self, org_id: str, repo_id: str) -> list[IngestKey]:
        result = await self.session.execute(
            select(IngestKey)
            .where(IngestKey.org_id == org_id, IngestKey.repo_id == repo_id)
            .order_by(IngestKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_org(self, org_id: str, key_id: str) -> IngestKey | None:
        result = await self.session.execute(select(IngestKey).where(IngestKey.id == key_id, IngestKey.org_id == org_id))
        return result.scalar_one_or_none()

    async def touch_last_used(self, key_id: str) -> None:
        """Record that a key was just used, without disturbing updated_at semantics elsewhere."""
        await self.session.execute(
            IngestKey.__table__.update().where(IngestKey.id == key_id).values(last_used_at=datetime.now(UTC))
        )
        await self.session.commit()
