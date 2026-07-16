"""Smoke-test Neon/Postgres + Supabase Storage using backend/.env.

Usage (from backend/):
  uv run python scripts/check_connections.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from urllib.parse import urlparse

# Allow running as a loose script without installing the package editable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text

from onboard.config.settings import get_settings
from onboard.core.database.postgres import dispose_engine, get_engine
from onboard.core.storage.supabase_client import get_storage_client


def redact_url(url: str) -> str:
    normalized = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    parsed = urlparse(normalized)
    base = f"postgresql+asyncpg://{parsed.hostname}:{parsed.port or 5432}{parsed.path}"
    return f"{base}?ssl=…" if parsed.query else base


async def check_postgres() -> bool:
    print("=== Neon / Postgres ===")
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            one = (await conn.execute(text("SELECT 1"))).scalar_one()
            print(f"SELECT 1 → {one}")
            vec = (
                await conn.execute(
                    text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')")
                )
            ).scalar_one()
            print(f"pgvector extension installed: {vec}")
            if not vec:
                print("HINT: run in Neon SQL Editor: CREATE EXTENSION IF NOT EXISTS vector;")
            version = (await conn.execute(text("SELECT version()"))).scalar_one()
            print(f"server: {version.split(',')[0]}")
        print("Postgres: OK")
        return True
    except Exception as e:
        print(f"Postgres: FAIL — {type(e).__name__}: {e}")
        return False
    finally:
        await dispose_engine()


async def check_supabase() -> bool:
    print("=== Supabase Storage ===")
    s = get_settings()
    if not s.SUPABASE_URL or not s.SUPABASE_SERVICE_ROLE_KEY:
        print("Supabase: SKIP — URL or service role key missing")
        return False

    path = "_connection_test/ping.pdf"
    try:
        storage = await get_storage_client()
        # Minimal PDF bytes — bucket may restrict MIME to application/pdf only.
        payload = b"%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
        await storage.upload(path, payload, "application/pdf")
        print(f"upload → {path}")
        downloaded = await storage.download(path)
        print(f"download → match={downloaded == payload}")
        signed = await storage.signed_url(path, 60)
        print(f"signed_url → {signed.split('?')[0]}?…")
        await storage.delete(path)
        print("delete → ok")
        print("Supabase Storage: OK")
        return True
    except Exception as e:
        print(f"Supabase Storage: FAIL — {type(e).__name__}: {e}")
        print("HINT: if mime error, allow more types on the bucket or keep PDF-only for now.")
        return False

async def main() -> None:
    s = get_settings()
    print("=== Settings ===")
    print(f"ENVIRONMENT: {s.ENVIRONMENT}")
    print(f"DATABASE_URL (redacted): {redact_url(s.DATABASE_URL)}")
    print(f"SUPABASE_URL: {s.SUPABASE_URL or '(empty)'}")
    print(f"SUPABASE_STORAGE_BUCKET: {s.SUPABASE_STORAGE_BUCKET}")
    print(f"SUPABASE_SERVICE_ROLE_KEY set: {bool(s.SUPABASE_SERVICE_ROLE_KEY)}")
    print()

    db_ok = await check_postgres()
    print()
    storage_ok = await check_supabase()
    print()
    if db_ok and storage_ok:
        print("All checks passed.")
        raise SystemExit(0)
    print("One or more checks failed.")
    raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
