from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.dao.models.base import AuditBase

ModelType = TypeVar("ModelType", bound=AuditBase)


class BaseDAO(Generic[ModelType]):
    """Generic async CRUD repository over a single SQLAlchemy model."""

    model: type[ModelType]

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: str) -> ModelType | None:
        return await self.session.get(self.model, id)

    async def list(self, limit: int = 100, offset: int = 0) -> list[ModelType]:
        result = await self.session.execute(select(self.model).limit(limit).offset(offset))
        return list(result.scalars().all())

    async def create(self, **fields: Any) -> ModelType:
        instance = self.model(**fields)
        self.session.add(instance)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def update(self, id: str, **fields: Any) -> ModelType | None:
        instance = await self.get_by_id(id)
        if instance is None:
            return None
        for key, value in fields.items():
            setattr(instance, key, value)
        await self.session.commit()
        await self.session.refresh(instance)
        return instance

    async def delete(self, id: str) -> bool:
        instance = await self.get_by_id(id)
        if instance is None:
            return False
        await self.session.delete(instance)
        await self.session.commit()
        return True
