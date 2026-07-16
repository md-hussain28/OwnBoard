EMBEDDING_DIMENSION = 1536

# Doc Pack RAG chunking (PRD §12) — ~600 tokens with ~15% overlap.
CHUNK_TARGET_TOKENS = 600
CHUNK_OVERLAP_TOKENS = 90
EMBEDDING_BATCH_SIZE = 64

# Cap concurrent OpenAI chat calls during quiz draft/verify (avoids rate-limit storms).
QUIZ_LLM_CONCURRENCY = 8

ALLOWED_DOC_PACK_EXTENSIONS = frozenset({"pdf", "docx", "txt", "md", "markdown"})

# Uploads are buffered in memory before hitting Supabase Storage — keep this conservative,
# the API runs on a 512MB instance.
MAX_DOC_PACK_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB per file
MAX_DOC_PACK_FILES_PER_UPLOAD = 10

APP_TITLE = "Onboard API"
APP_DESCRIPTION = "Backend for Onboard - onboarding quizzes, repo readiness gating, skill-graph bus-factor detection"
