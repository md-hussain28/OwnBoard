import uuid

import pytest

from onboard.core.common.exceptions import ValidationError
from onboard.dao.models.doc_pack import DocPackStatus, PackAssignmentStatus
from onboard.dao.models.quiz_template import QuizType
from onboard.dao.organization_dao import OrganizationDAO
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.project.project_service import ProjectService


async def _publish_track(service: ProjectService, org_id: str, project_id: str, name: str):
    """Create a project track with a published quiz so it becomes a gating assignment on add_members."""
    pack = await service.pack_dao.create(org_id=org_id, project_id=project_id, name=name, status=DocPackStatus.active)
    await QuizTemplateDAO(service.session).create(type=QuizType.doc_pack, source_ref=pack.id, is_published=True)
    return pack


@pytest.mark.asyncio
async def test_project_lifecycle_readiness_and_revoke(db_session):
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(db_session).get_or_create(org_id)
    service = ProjectService(db_session)

    admin = await service.employee_dao.create(org_id=org_id, name="Ada Admin", app_role="admin")
    member = await service.employee_dao.create(org_id=org_id, name="Milo Member", app_role="member")

    created_pack_ids: list[str] = []
    template_ids: list[str] = []
    project_id: str | None = None
    try:
        # --- create project ---
        project = await service.create_project(
            org_id=org_id, name="Payments", description="Payments service", repo_id=None, created_by=admin.id
        )
        project_id = project.id
        assert project.name == "Payments"

        # Two published project tracks — both must be passed to unlock.
        pack_a = await _publish_track(service, org_id, project_id, "Track A")
        pack_b = await _publish_track(service, org_id, project_id, "Track B")
        created_pack_ids += [pack_a.id, pack_b.id]

        # --- add member auto-assigns published project tracks ---
        await service.add_members(org_id, project_id, [member.id], added_by=admin.id)
        assignments = await service.assignment_dao.list_for_project(org_id, project_id)
        member_assignments = [a for a in assignments if a.employee_id == member.id]
        assert len(member_assignments) == 2

        # --- readiness locked until all passed; not yet a go-to person ---
        panel = await service.list_project_members(org_id, project_id, viewer=admin)
        row = next(r for r in panel if r.employee_id == member.id)
        assert row.readiness.locked is True
        assert row.is_go_to is False

        # Pass one track — still locked.
        await service.assignment_dao.update(member_assignments[0].id, status=PackAssignmentStatus.passed)
        panel = await service.list_project_members(org_id, project_id, viewer=admin)
        row = next(r for r in panel if r.employee_id == member.id)
        assert row.readiness.locked is True
        assert row.readiness.passed_tracks == 1

        # Pass the second — now ready and is_go_to flips.
        await service.assignment_dao.update(member_assignments[1].id, status=PackAssignmentStatus.passed)
        panel = await service.list_project_members(org_id, project_id, viewer=admin)
        row = next(r for r in panel if r.employee_id == member.id)
        assert row.readiness.locked is False
        assert row.is_go_to is True

        # --- remove_member revokes the member's project-track assignments (P1) ---
        await service.remove_member(org_id, project_id, member.id)
        remaining = await service.assignment_dao.list_for_project(org_id, project_id)
        assert [a for a in remaining if a.employee_id == member.id] == []
        my_projects = await service.list_my_projects(org_id, member)
        assert all(p.id != project_id for p in my_projects)
    finally:
        # doc_pack (and its assignments/acks) cascade off the project; templates have no FK, delete them.
        if project_id is not None:
            await service.project_dao.delete(project_id)
        for pack_id in created_pack_ids:
            for tpl in await QuizTemplateDAO(db_session).list_by_type(QuizType.doc_pack):
                if tpl.source_ref == pack_id:
                    template_ids.append(tpl.id)
        for tpl_id in set(template_ids):
            await QuizTemplateDAO(db_session).delete(tpl_id)
        await service.employee_dao.delete(admin.id)
        await service.employee_dao.delete(member.id)
        await OrganizationDAO(db_session).delete(org_id)


@pytest.mark.asyncio
async def test_add_members_rejects_admin(db_session):
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(db_session).get_or_create(org_id)
    service = ProjectService(db_session)

    admin = await service.employee_dao.create(org_id=org_id, name="Ada Admin", app_role="admin")
    project_id: str | None = None
    try:
        project = await service.create_project(
            org_id=org_id, name="Ledger", description=None, repo_id=None, created_by=admin.id
        )
        project_id = project.id
        with pytest.raises(ValidationError):
            await service.add_members(org_id, project_id, [admin.id], added_by=admin.id)
    finally:
        if project_id is not None:
            await service.project_dao.delete(project_id)
        await service.employee_dao.delete(admin.id)
        await OrganizationDAO(db_session).delete(org_id)
