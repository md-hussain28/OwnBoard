from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from onboard.config.constants import EMBEDDING_DIMENSION
from onboard.dao.models.base import AuditBase


class CodeChunk(AuditBase):
    __tablename__ = "code_chunk"

    repo_id: Mapped[str] = mapped_column(ForeignKey("repo.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIMENSION), nullable=True)

    repo: Mapped["Repo"] = relationship(back_populates="code_chunks")
