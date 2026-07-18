"""End-to-end tests for the GitHub knowledge-base pipeline: ingest → skill graph → expert routing.

Uses the real local Postgres (see conftest) and cleans up its own rows. No LLM calls: expert routing
is exercised with draft=False so only deterministic selection runs.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from onboard.api.schema.ingest.request import (
    IngestCodeChunk,
    IngestCommit,
    IngestContributor,
    IngestFileExpertise,
    IngestPayload,
    IngestRepoMeta,
)
from onboard.dao.expertise_availability_dao import ExpertiseAvailabilityDAO
from onboard.dao.models.expertise_availability import ExpertiseAvailability
from onboard.dao.organization_dao import OrganizationDAO
from onboard.services.expert_routing.expert_routing_service import ExpertRoutingService
from onboard.services.ingest.ingest_service import IngestService
from onboard.services.repo_ingestion.repo_ingestion_service import RepoIngestionService
from onboard.services.skill_graph.skill_graph_service import SkillGraphService

NOW = datetime.now(UTC)


def _payload() -> IngestPayload:
    return IngestPayload(
        repo=IngestRepoMeta(name="fixture", default_branch="main", head_sha="abc"),
        contributors=[
            IngestContributor(name="Ada", email="ada@x.com", handle="ada"),
            IngestContributor(name="Ben", email="ben@x.com", handle="ben"),
        ],
        commits=[
            IngestCommit(
                hash="a1", message="auth work", author_email="ada@x.com", committed_at=NOW - timedelta(days=3)
            ),
            IngestCommit(
                hash="b1", message="old util", author_email="ben@x.com", committed_at=NOW - timedelta(days=500)
            ),
        ],
        file_expertise=[
            IngestFileExpertise(
                file_path="core/auth.py",
                author_email="ada@x.com",
                commit_count=10,
                last_commit_at=NOW - timedelta(days=3),
            ),
            IngestFileExpertise(
                file_path="core/auth.py",
                author_email="ben@x.com",
                commit_count=1,
                last_commit_at=NOW - timedelta(days=400),
            ),
            IngestFileExpertise(
                file_path="core/util.py",
                author_email="ben@x.com",
                commit_count=4,
                last_commit_at=NOW - timedelta(days=10),
            ),
        ],
        code_chunks=[IngestCodeChunk(file_path="core/auth.py", content="def login(): ...")],
    )


async def _make_repo(session):
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(session).get_or_create(org_id)
    repo = await RepoIngestionService(session).register_repo(
        org_id=org_id, url=f"https://github.com/x/y-{uuid.uuid4().hex[:6]}", name="y"
    )
    return org_id, repo


async def _cleanup(session, org_id, repo_id):
    await RepoIngestionService(session).repo_dao.delete(repo_id)  # cascades to graph rows
    await OrganizationDAO(session).delete(org_id)


@pytest.mark.asyncio
async def test_ingest_writes_graph_and_is_idempotent(db_session):
    org_id, repo = await _make_repo(db_session)
    try:
        summary = await IngestService(db_session).ingest_metadata(org_id, repo.id, _payload())
        assert summary["contributors_upserted"] == 2
        assert summary["commits_written"] == 2
        assert summary["files_written"] == 3
        assert summary["chunks_written"] == 1

        refreshed = await RepoIngestionService(db_session).get_repo(org_id, repo.id)
        assert refreshed.ingested_at is not None

        # Re-ingest replaces rather than duplicates.
        again = await IngestService(db_session).ingest_metadata(org_id, repo.id, _payload())
        assert again["files_written"] == 3
        scores = await SkillGraphService(db_session).compute_expertise_scores(org_id, repo.id)
        assert len(scores) == 3
    finally:
        await _cleanup(db_session, org_id, repo.id)


@pytest.mark.asyncio
async def test_skill_graph_scoring_and_bus_factor(db_session):
    org_id, repo = await _make_repo(db_session)
    try:
        await IngestService(db_session).ingest_metadata(org_id, repo.id, _payload())
        scores = await SkillGraphService(db_session).compute_expertise_scores(org_id, repo.id)

        auth = {(s["contributor_name"]): s["revert_adjusted_score"] for s in scores if s["file_path"] == "core/auth.py"}
        # Ada: 10 recent commits ≫ Ben: 1 old commit.
        assert auth["Ada"] > auth["Ben"]

        bus = {b["file_path"]: b for b in await SkillGraphService(db_session).compute_bus_factor(org_id, repo.id)}
        assert bus["core/auth.py"]["risk_level"] == "high"  # Ada holds >80% of the score
        assert bus["core/util.py"]["risk_level"] == "high"  # single contributor (Ben)
    finally:
        await _cleanup(db_session, org_id, repo.id)


@pytest.mark.asyncio
async def test_expert_routing_prefers_top_and_respects_availability(db_session):
    org_id, repo = await _make_repo(db_session)
    try:
        await IngestService(db_session).ingest_metadata(org_id, repo.id, _payload())
        service = ExpertRoutingService(db_session)

        routed = await service.route_to_expert(org_id, repo.id, "core/auth.py", draft=False)
        assert routed["contributor_name"] == "Ada"
        assert routed["evidence"]
        assert 0.0 < routed["confidence"] <= 1.0

        # Opt Ada out → routing must fall to Ben (bus-factor consent, PRD §7).
        contributors = await service.file_expertise_dao.list_for_file(repo.id, "core/auth.py")
        ada_id = next(fe.contributor_id for fe in contributors if fe.contributor.name == "Ada")
        db_session.add(ExpertiseAvailability(contributor_id=ada_id, available=False))
        await db_session.commit()

        rerouted = await service.route_to_expert(org_id, repo.id, "core/auth.py", draft=False)
        assert rerouted["contributor_name"] == "Ben"

        await ExpertiseAvailabilityDAO(db_session).delete(
            (await ExpertiseAvailabilityDAO(db_session).get_for_contributor(ada_id)).id
        )
    finally:
        await _cleanup(db_session, org_id, repo.id)
