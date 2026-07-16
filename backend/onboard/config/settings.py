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
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"

    # Clerk (backend token verification). Never expose CLERK_SECRET_KEY to the browser.
    CLERK_SECRET_KEY: str = ""
    CLERK_JWT_KEY: str = ""
    CLERK_AUTHORIZED_PARTIES: str = "http://localhost:3000"

    # Supabase Storage (doc pack file uploads). Service role key is server-only —
    # never expose it to the browser; it bypasses Row Level Security entirely.
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "doc-packs"

    @property
    def DATABASE_URL(self) -> str:
        """Active Postgres URL for the current ENVIRONMENT (local Docker vs Neon)."""
        env = self.ENVIRONMENT.strip().lower()
        if env in ("prod", "production"):
            if not self.DATABASE_URL_PROD.strip():
                raise ValueError("DATABASE_URL_PROD is required when ENVIRONMENT is prod/production")
            url = self.DATABASE_URL_PROD.strip()
        else:
            url = self.DATABASE_URL_LOCAL.strip()
        # Neon pooler URLs often include channel_binding=require; asyncpg rejects it.
        return url.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?").replace(
            "?channel_binding=require", ""
        )
    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def clerk_authorized_parties(self) -> list[str]:
        return [origin.strip() for origin in self.CLERK_AUTHORIZED_PARTIES.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
