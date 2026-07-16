from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from onboard.config.constants import CHUNK_OVERLAP_TOKENS, CHUNK_TARGET_TOKENS
from onboard.core.rag.extract import ExtractedDocument

# Approximate chars/token for English prose; avoids a runtime tiktoken download.
_CHARS_PER_TOKEN = 4


def _splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_TARGET_TOKENS * _CHARS_PER_TOKEN,
        chunk_overlap=CHUNK_OVERLAP_TOKENS * _CHARS_PER_TOKEN,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


@dataclass
class ChunkDraft:
    chunk_index: int
    content: str
    token_count: int
    page_start: int | None
    page_end: int | None
    section_title: str | None


def chunk_extracted_document(extracted: ExtractedDocument) -> list[ChunkDraft]:
    """Structure-aware chunking: split within page/section units, then fall back to fixed windows."""
    splitter = _splitter()
    drafts: list[ChunkDraft] = []
    chunk_index = 0

    for page in extracted.pages:
        if not page.text.strip():
            continue
        pieces = splitter.split_text(page.text)
        if not pieces:
            continue
        for piece in pieces:
            drafts.append(
                ChunkDraft(
                    chunk_index=chunk_index,
                    content=piece.strip(),
                    token_count=_estimate_tokens(piece),
                    page_start=page.page_number,
                    page_end=page.page_number,
                    section_title=page.section_title,
                )
            )
            chunk_index += 1

    if drafts:
        return drafts

    # Fallback: whole-doc fixed windows when page structure produced nothing useful.
    full = extracted.full_text
    if not full.strip():
        return []
    for piece in splitter.split_text(full):
        drafts.append(
            ChunkDraft(
                chunk_index=chunk_index,
                content=piece.strip(),
                token_count=_estimate_tokens(piece),
                page_start=None,
                page_end=None,
                section_title=None,
            )
        )
        chunk_index += 1
    return drafts


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // _CHARS_PER_TOKEN)
