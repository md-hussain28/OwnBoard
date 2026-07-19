from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: str = "local"
    LOG_LEVEL: str = "INFO"

    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_VERSION_PREFIX: str = "/api/v1"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Selected via ENVIRONMENT: local → DATABASE_URL_LOCAL, prod/production → DATABASE_URL_PROD.
    DATABASE_URL_LOCAL: str = "postgresql+asyncpg://onboard:onboard@localhost:5432/onboard"
    DATABASE_URL_PROD: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    # Default (fast/cheap) chat model for most calls; the complex model is used only when the
    # "Ask project" question is judged complex (see ProjectChatService._select_model).
    OPENAI_CHAT_MODEL: str = "gpt-4.1-mini"
    OPENAI_CHAT_MODEL_COMPLEX: str = "gpt-4.1"
    # Dedicated model for the agentic admin assistant tool loop (add member, create hire, assign
    # track, analytics). Empty → falls back to OPENAI_CHAT_MODEL_COMPLEX. Bump to a stronger agentic
    # model (e.g. gpt-5.1) via env with no code change if the assistant needs more reliability.
    OPENAI_ASSISTANT_MODEL: str = ""

    # Clerk (backend token verification). Never expose CLERK_SECRET_KEY to the browser.
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_KEY: str = ""
    CLERK_AUTHORIZED_PARTIES: str = "http://localhost:3000"

    # Used for Clerk invitation redirect_url (sign-in after accept).
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    # Supabase Storage (doc pack file uploads). Service role key is server-only —
    # never expose it to the browser; it bypasses Row Level Security entirely.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "doc-packs"

    @property
    def is_prod(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("prod", "production")

    @property
    def DATABASE_URL(self) -> str:
        """Active Postgres URL for the current ENVIRONMENT (local Docker vs Neon)."""
        if self.is_prod:
            if not self.DATABASE_URL_PROD.strip():
                raise ValueError("DATABASE_URL_PROD is required when ENVIRONMENT is prod/production")
            url = self.DATABASE_URL_PROD.strip()
        else:
            url = self.DATABASE_URL_LOCAL.strip()
        return _normalize_database_url(url, require_ssl=self.is_prod)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def clerk_authorized_parties(self) -> list[str]:
        return [origin.strip() for origin in self.CLERK_AUTHORIZED_PARTIES.split(",") if origin.strip()]


def _normalize_database_url(url: str, *, require_ssl: bool) -> str:
    """Rewrite hosted Postgres URLs for asyncpg (scheme + ssl + Neon quirks)."""
    # Render/Neon dashboards often hand out postgres:// or postgresql:// without +asyncpg.
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")

    # Neon pooler URLs often include channel_binding=require; asyncpg rejects it.
    url = (
        url.replace("&channel_binding=require", "")
        .replace("?channel_binding=require&", "?")
        .replace("?channel_binding=require", "")
    )

    if require_ssl and "ssl=" not in url and "sslmode=" not in url:
        url += "&ssl=require" if "?" in url else "?ssl=require"

    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
