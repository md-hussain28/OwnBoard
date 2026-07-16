EMBEDDING_DIMENSION = 1536

# Doc Pack RAG chunking (PRD §12) — ~600 tokens with ~15% overlap.
CHUNK_TARGET_TOKENS = 600
CHUNK_OVERLAP_TOKENS = 90
EMBEDDING_BATCH_SIZE = 64

ALLOWED_DOC_PACK_EXTENSIONS = frozenset({"pdf", "docx", "txt", "md", "markdown"})

APP_TITLE = "Onboard API"
APP_DESCRIPTION = "Backend for Onboard - onboarding quizzes, repo readiness gating, skill-graph bus-factor detection"
