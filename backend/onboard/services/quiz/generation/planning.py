"""Deterministic coverage planning — decides question slots per document, no LLM call (PRD §5.2)."""

from __future__ import annotations

from onboard.core.common.ids import typed_id
from onboard.dao.models.quiz_question import QuestionFormat
from onboard.services.quiz.generation.models import ChunkForPlanning, DocumentForPlanning, SlotPlan


def _stride_sample(chunks: list[ChunkForPlanning], count: int) -> list[ChunkForPlanning]:
    if count >= len(chunks):
        return list(chunks)
    if count <= 0:
        return []
    step = len(chunks) / count
    return [chunks[int(i * step)] for i in range(count)]


def _citation_for(title: str, chunk: ChunkForPlanning) -> str:
    if chunk.page_start is not None:
        if chunk.page_end and chunk.page_end != chunk.page_start:
            return f"{title}, p. {chunk.page_start}-{chunk.page_end}"
        return f"{title}, p. {chunk.page_start}"
    return f"{title}, chunk {chunk.chunk_index}"


def plan_coverage(documents: list[DocumentForPlanning], target_count: int, formats: list[str]) -> list[SlotPlan]:
    """Deterministic slot planning — no LLM call (Doc Pack PRD §5.2)."""
    docs = [d for d in documents if d.chunks]
    if not docs:
        return []

    if len(docs) > target_count:
        docs = sorted(docs, key=lambda d: len(d.chunks), reverse=True)[:target_count]

    total_docs = len(docs)
    slot_counts = {d.document_id: 1 for d in docs}
    remaining = target_count - total_docs

    if remaining > 0:
        total_chunks = sum(len(d.chunks) for d in docs) or 1
        raw_shares = {d.document_id: remaining * (len(d.chunks) / total_chunks) for d in docs}
        floor_shares = {doc_id: int(share) for doc_id, share in raw_shares.items()}
        leftover = remaining - sum(floor_shares.values())
        by_remainder = sorted(raw_shares.items(), key=lambda kv: kv[1] - floor_shares[kv[0]], reverse=True)
        for doc_id, _ in by_remainder[:leftover]:
            floor_shares[doc_id] += 1
        for doc_id, extra in floor_shares.items():
            slot_counts[doc_id] += extra

    format_cycle = formats or ["mcq_4"]
    slots: list[SlotPlan] = []
    format_index = 0
    for doc in docs:
        for chunk in _stride_sample(doc.chunks, slot_counts[doc.document_id]):
            fmt = QuestionFormat(format_cycle[format_index % len(format_cycle)])
            format_index += 1
            slots.append(
                SlotPlan(
                    slot_id=typed_id("slot"),
                    document_id=doc.document_id,
                    document_title=doc.title,
                    format=fmt,
                    chunk_content=chunk.content,
                    citation=_citation_for(doc.title, chunk),
                )
            )
    return slots
