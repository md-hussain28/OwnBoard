import uuid

import pytest

from onboard.api.schema.project.request import TrackRepoRuleInput
from onboard.core.common.exceptions import ForbiddenError, ValidationError
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
        await service.add_members(org_id, project_id, [member.id], added_by=admin.id, viewer=admin)
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
        await service.remove_member(org_id, project_id, member.id, viewer=admin)
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
async def test_modules_function_autoassign_and_team_lead(db_session):
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(db_session).get_or_create(org_id)
    service = ProjectService(db_session)

    admin = await service.employee_dao.create(org_id=org_id, name="Ada Admin", app_role="admin")
    fe = await service.employee_dao.create(org_id=org_id, name="Fran Frontend", app_role="member")
    be = await service.employee_dao.create(org_id=org_id, name="Ben Backend", app_role="member")
    project_id: str | None = None
    try:
        project = await service.create_project(
            org_id=org_id, name="Console", description=None, repo_id=None, created_by=admin.id
        )
        project_id = project.id

        # Per-project function types.
        frontend = await service.create_function_type(org_id, project_id, admin, name="Frontend", sort_order=0)
        await service.create_function_type(org_id, project_id, admin, name="Backend", sort_order=1)

        # An active module targeting Frontend.
        module = await service.create_module(
            org_id,
            project_id,
            admin,
            name="Frontend architecture",
            description=None,
            content="How the UI is laid out.",
            resource_links=None,
            function_type_ids=[frontend.id],
            sequence_order=0,
            estimated_minutes=15,
            status="active",
            created_by=admin.id,
        )

        # Adding a Frontend member auto-assigns the Frontend module; a Backend member does not get it.
        await service.add_members(
            org_id, project_id, [fe.id], added_by=admin.id, viewer=admin, function_type_id=frontend.id
        )
        await service.add_members(org_id, project_id, [be.id], added_by=admin.id, viewer=admin)
        assert await service.module_assignment_dao.get_for_module_and_employee(module.id, fe.id) is not None
        assert await service.module_assignment_dao.get_for_module_and_employee(module.id, be.id) is None

        # The Frontend member sees the module in their member view and can complete it.
        fe_modules = await service.list_modules(org_id, project_id, fe)
        assert any(m.id == module.id and m.my_status == "assigned" for m in fe_modules)
        done = await service.set_module_progress(org_id, project_id, module.id, fe, status="completed")
        assert done.my_completed is True

        # A plain member cannot manage; promoting them to lead grants scoped management.
        with pytest.raises(ForbiddenError):
            await service.create_function_type(org_id, project_id, fe, name="QA", sort_order=2)
        await service.update_member(org_id, project_id, fe.id, admin, is_lead=True)
        qa = await service.create_function_type(org_id, project_id, fe, name="QA", sort_order=2)
        assert qa.name == "QA"

        # can_manage is reflected for the lead but not the plain member.
        assert (await service.get_project_detail(org_id, project_id, fe)).can_manage is True
        assert (await service.get_project_detail(org_id, project_id, be)).can_manage is False
    finally:
        if project_id is not None:
            await service.project_dao.delete(project_id)
        await service.employee_dao.delete(admin.id)
        await service.employee_dao.delete(fe.id)
        await service.employee_dao.delete(be.id)
        await OrganizationDAO(db_session).delete(org_id)


@pytest.mark.asyncio
async def test_onboarding_union_targeting_and_reconcile(db_session):
    """Combinable targeting: audience = union of domains ∪ repo(+domain) ∪ manual, and it reconciles
    (adds + removes auto assignments, keeps manual ones) when a member's domain or repo assignees change."""
    org_id = f"org_test_{uuid.uuid4().hex[:8]}"
    await OrganizationDAO(db_session).get_or_create(org_id)
    service = ProjectService(db_session)

    admin = await service.employee_dao.create(org_id=org_id, name="Ada Admin", app_role="admin")
    fe = await service.employee_dao.create(org_id=org_id, name="Fran Frontend", app_role="member")
    be = await service.employee_dao.create(org_id=org_id, name="Ben Backend", app_role="member")
    qa = await service.employee_dao.create(org_id=org_id, name="Quinn QA", app_role="member")
    zoe = await service.employee_dao.create(org_id=org_id, name="Zoe Nobody", app_role="member")
    project_id: str | None = None
    created_pack_ids: list[str] = []
    repo_id: str | None = None
    try:
        project = await service.create_project(
            org_id=org_id, name="Union", description=None, repo_id=None, created_by=admin.id
        )
        project_id = project.id
        frontend = await service.create_function_type(org_id, project_id, admin, name="Frontend", sort_order=0)
        backend = await service.create_function_type(org_id, project_id, admin, name="Backend", sort_order=1)

        await service.add_members(
            org_id, project_id, [fe.id], added_by=admin.id, viewer=admin, function_type_id=frontend.id
        )
        await service.add_members(
            org_id, project_id, [be.id], added_by=admin.id, viewer=admin, function_type_id=backend.id
        )
        await service.add_members(org_id, project_id, [qa.id], added_by=admin.id, viewer=admin)
        await service.add_members(org_id, project_id, [zoe.id], added_by=admin.id, viewer=admin)

        # A linked repo with only fe assigned to work on it.
        await service.add_repo(
            org_id,
            project_id,
            admin,
            repo_id=None,
            url="https://github.com/x/union",
            name="union",
            is_primary=True,
            added_by=admin.id,
        )
        link = (await service.repo_link_dao.list_for_project(project_id))[0]
        repo_id = link.repo_id
        await service.set_repo_members(org_id, project_id, repo_id, admin, [fe.id])

        pack = await _publish_track(service, org_id, project_id, "Onboarding")
        created_pack_ids.append(pack.id)

        # Union: Backend domain ∪ people-on-repo-who-are-Frontend ∪ manually-picked qa. NOT everyone.
        track = await service.update_track_assignment(
            org_id,
            project_id,
            pack.id,
            admin,
            target_all_members=False,
            domain_ids=[backend.id],
            repo_rules=[TrackRepoRuleInput(repo_id=repo_id, domain_id=frontend.id)],
            manual_employee_ids=[qa.id],
        )
        assigned = set(track.assignee_ids)
        assert assigned == {be.id, fe.id, qa.id}  # zoe matches nothing
        assert zoe.id not in assigned

        # Change zoe's domain to Backend → recompute adds her (domain rule now matches).
        await service.update_member(org_id, project_id, zoe.id, admin, function_type_id=backend.id)
        assigned = set(await service.assignment_dao.list_assigned_employee_ids(pack.id))
        assert zoe.id in assigned
        assert qa.id in assigned  # manual assignment survives reconcile

        # Drop fe from the repo → fe no longer matches any rule → auto assignment revoked.
        await service.set_repo_members(org_id, project_id, repo_id, admin, [])
        assigned = set(await service.assignment_dao.list_assigned_employee_ids(pack.id))
        assert fe.id not in assigned
        assert {be.id, qa.id, zoe.id} <= assigned
    finally:
        if project_id is not None:
            await service.project_dao.delete(project_id)
        for pack_id in created_pack_ids:
            for tpl in await QuizTemplateDAO(db_session).list_by_type(QuizType.doc_pack):
                if tpl.source_ref == pack_id:
                    await QuizTemplateDAO(db_session).delete(tpl.id)
        if repo_id is not None:
            await service.repo_dao.delete(repo_id)
        for emp in (admin, fe, be, qa, zoe):
            await service.employee_dao.delete(emp.id)
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
            await service.add_members(org_id, project_id, [admin.id], added_by=admin.id, viewer=admin)
    finally:
        if project_id is not None:
            await service.project_dao.delete(project_id)
        await service.employee_dao.delete(admin.id)
        await OrganizationDAO(db_session).delete(org_id)
