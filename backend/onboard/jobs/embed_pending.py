"""Off-dyno embedding backfill: `python -m onboard.jobs.embed_pending`.

Ingestion writes code chunks with `embedding = NULL` and does no embedding on the web host — that
work is deliberately moved off the 512MB / 0.1-CPU Render dyno. This standalone job (run by a
GitHub Actions cron on our repo, against `DATABASE_URL`) drains the pending chunks: it calls the
OpenAI embeddings API on GitHub's runner and writes the vectors back. It's safe to re-run — once
every chunk is embedded it's a no-op.
"""

import asyncio

from onboard.config.constants import EMBEDDING_BATCH_SIZE
from onboard.core.common.logger import configure_logging, get_logger
from onboard.core.database.postgres import dispose_engine, get_session_factory
from onboard.services.rag.rag_service import RAGService

logger = get_logger("onboard.jobs.embed_pending")

# One pass grabs several embed batches at a time to cut query round-trips; the loop drains the rest.
_PASS_LIMIT = EMBEDDING_BATCH_SIZE * 8


async def _run() -> int:
    factory = get_session_factory()
    total = 0
    async with factory() as session:
        rag = RAGService(session)
        while True:
            embedded = await rag.embed_pending_chunks(limit=_PASS_LIMIT)
            if embedded == 0:
                break
            total += embedded
            logger.info("embedded_pass", extra={"pass": embedded, "total": total})
    await dispose_engine()
    return total


def main() -> None:
    configure_logging()
    total = asyncio.run(_run())
    logger.info("embed_pending_done", extra={"total": total})
    print(f"Embedded {total} pending code chunk(s).")


if __name__ == "__main__":
    main()
