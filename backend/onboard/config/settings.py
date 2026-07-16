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

    DATABASE_URL: str = "postgresql+asyncpg://onboard:onboard@localhost:5432/onboard"

    OPENAI_API_KEY: str = ""
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
