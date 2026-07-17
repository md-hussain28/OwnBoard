EMBEDDING_DIMENSION = 1536

# Doc Pack RAG chunking (PRD §12) — ~600 tokens with ~15% overlap.
CHUNK_TARGET_TOKENS = 600
CHUNK_OVERLAP_TOKENS = 90
EMBEDDING_BATCH_SIZE = 64

# Cap concurrent OpenAI chat calls during quiz draft/verify (avoids rate-limit storms).
QUIZ_LLM_CONCURRENCY = 8

ALLOWED_DOC_PACK_EXTENSIONS = frozenset({"pdf"})

# Ingestion runs as an in-process background task, so a host restart mid-ingest strands the
# document in `uploaded`/`processing` forever. The status poll self-heals: any document that
# hasn't moved within the stale window is requeued, up to the attempt cap, then marked failed.
DOC_INGEST_STALE_AFTER_SECONDS = 10 * 60
MAX_DOC_INGEST_ATTEMPTS = 3

# Uploads are buffered in memory before hitting Supabase Storage — keep this conservative,
# the API runs on a 512MB instance.
MAX_DOC_PACK_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB per file
MAX_DOC_PACK_FILES_PER_UPLOAD = 10

APP_TITLE = "OwnBoard API"
APP_DESCRIPTION = "Backend for OwnBoard - onboarding quizzes, repo readiness gating, skill-graph bus-factor detection"

# OwnBoard org RBAC — Clerk membership is auth/tenancy only; access lives on employee.app_role.
APP_ROLE_ADMIN = "admin"
APP_ROLE_MEMBER = "member"
APP_ROLES = frozenset({APP_ROLE_ADMIN, APP_ROLE_MEMBER})
# Clerk role strings that may appear on legacy employee.role rows or bootstrap memberships.
CLERK_ORG_ADMIN_ROLES = frozenset({"org:admin", "admin"})

# Seeded once per org on first domain list — admins can add more custom domains.
DEFAULT_ORG_DOMAINS = (
    "Developer",
    "Marketing",
    "Design",
    "Product",
    "Sales",
    "Operations",
    "People",
    "Finance",
)

# Seeded once per org on first quiz-domain list — admins can add more (Policy, Holiday, …).
DEFAULT_QUIZ_DOMAINS = (
    "Policy",
    "Security",
    "Holiday",
    "Onboarding",
    "Benefits",
    "Codebase",
)
