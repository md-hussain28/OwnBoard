from onboard.core.rag.chunking import chunk_extracted_document
from onboard.core.rag.extract import ExtractedDocument, ExtractedPage, extract_document


def test_extract_plain_text():
    extracted = extract_document(b"Hello policy world.\n\nSecond paragraph.", "txt")
    assert extracted.page_count == 1
    assert "Hello policy world" in extracted.full_text


def test_chunk_structure_aware_pages():
    extracted = ExtractedDocument(
        pages=[
            ExtractedPage(page_number=1, text="A" * 2000, section_title="Intro"),
            ExtractedPage(page_number=2, text="B" * 2000, section_title="Rules"),
        ],
        page_count=2,
    )
    drafts = chunk_extracted_document(extracted)
    assert len(drafts) >= 2
    assert drafts[0].page_start == 1
    assert any(d.page_start == 2 for d in drafts)
    assert all(d.content for d in drafts)
