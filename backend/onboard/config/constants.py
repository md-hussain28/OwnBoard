EMBEDDING_DIMENSION = 1536

# Doc Pack RAG chunking (PRD §12) — ~600 tokens with ~15% overlap.
CHUNK_TARGET_TOKENS = 600
CHUNK_OVERLAP_TOKENS = 90
EMBEDDING_BATCH_SIZE = 64

# Cap concurrent OpenAI chat calls during quiz draft/verify (avoids rate-limit storms).
QUIZ_LLM_CONCURRENCY = 8

ALLOWED_DOC_PACK_EXTENSIONS = frozenset({"pdf"})

# Ingestion runs as an in-process background task, so a host restart mid-ingest strands the
# document in `uploaded`/`processing` forever. The status poll marks such documents failed after
# the stale window — it never restarts them (an ingest may be what OOM'd the host; auto-requeue
# would loop the crash). Recovery is the manual retry endpoint only. The window is generous
# because ingests run one-at-a-time and a large batch legitimately queues for a while.
DOC_INGEST_STALE_AFTER_SECONDS = 30 * 60
MAX_DOC_INGEST_ATTEMPTS = 3

# Uploads are buffered in memory before hitting Supabase Storage — keep this conservative,
# the API runs on a 512MB instance.
MAX_DOC_PACK_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB per file
MAX_DOC_PACK_FILES_PER_UPLOAD = 10
# The size cap alone doesn't bound extraction memory: a compressed/generated PDF can pack
# thousands of pages into 5MB and OOM the parser on the 512MB host. Real 5MB docs are far smaller.
MAX_PDF_PAGES = 800

# Hard cap on any request body, enforced from Content-Length before a byte is buffered
# (api/middleware/body_limit.py). FastAPI has no default limit, so without this one big POST
# (a git-snapshot push) gets fully read + JSON-parsed and can OOM the 512MB host by itself.
# Sized to the worst-case Action snapshot (~20MB of chunk text) with headroom.
MAX_REQUEST_BODY_BYTES = 30 * 1024 * 1024

# Push-model ingest (GitHub Action → POST /ingest). These caps bound how much a single request can
# allocate on the 512MB host — the request is rejected (422) before any DB work if exceeded.
# INGEST_MAX_CHUNKS × INGEST_MAX_CHUNK_CHARS is the payload's dominant term; keep the product well
# under MAX_REQUEST_BODY_BYTES (the Action's own caps in .github/actions/ownboard-extract are lower).
INGEST_MAX_CONTRIBUTORS = 5_000
INGEST_MAX_COMMITS = 20_000
INGEST_MAX_FILES = 20_000
INGEST_MAX_CHUNKS = 3_000
INGEST_MAX_CHUNK_CHARS = 12_000  # per code chunk; longer content is truncated before embedding

# Skill-graph expertise scoring (PRD §6.2): commit weight decays with a 180-day half-life so recent
# work counts more, and is penalised when a contributor's changes were shortly reverted.
EXPERTISE_HALF_LIFE_DAYS = 180.0
EXPERTISE_REVERT_PENALTY = 0.15  # score multiplier lost per associated revert, floored at 0.2

# Archaeology Q&A escalates to a human below this answer confidence (PRD §6.4/§7 — never guess).
ARCHAEOLOGY_CONFIDENCE_THRESHOLD = 0.55

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
