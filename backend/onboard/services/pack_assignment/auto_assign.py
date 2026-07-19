"""Domain/everyone auto-assignment engine (Track PRD §auto-assign).

Two entry points, both additive and idempotent (they never revoke, and re-running is a no-op):

- `assign_pack_to_audience` — fired when a track's quiz is published or its audience changes:
  assign every current employee the track targets.
- `assign_matching_packs_to_employee` — fired when a hire is created or their domain changes:
  assign every already-published track that targets them.

A track only auto-assigns once it has a *published* quiz (assignment needs a template to point at), so
these are safe to call eagerly — an unpublished track simply matches nothing.
"""

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.logger import get_logger
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import PackAssignmentStatus
from onboard.dao.models.quiz_template import QuizType
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.dao.project_dao import ProjectMemberDAO, ProjectRepoMemberDAO
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.pack_assignment.assign_helpers import compute_due_at, notify_assigned

logger = get_logger("onboard.auto_assign")


async def assign_pack_to_audience(session: AsyncSession, org_id: str, pack_id: str) -> int:
    """Assign a published track to everyone it currently targets. Returns the number created."""
    pack_dao = DocPackDAO(session)
    employee_dao = EmployeeDAO(session)
    assignment_dao = PackAssignmentDAO(session)
    template_dao = QuizTemplateDAO(session)

    pack = await pack_dao.get_by_id_for_org(org_id, pack_id)
    if pack is None:
        return 0

    # Project modules use combinable union targeting — reconcile via the dedicated engine.
    if pack.project_id is not None:
        return await recompute_pack_audience(session, org_id, pack_id)

    published = await template_dao.get_latest_published_for_source(pack_id, QuizType.doc_pack)
    if published is None:
        return 0  # No published quiz yet — nothing to point assignments at.

    audience_domain_ids = {a.org_domain_id for a in pack.audience_domains}
    if not pack.assign_to_all and not audience_domain_ids:
        return 0  # Manual-only track.

    employees = await employee_dao.list_for_org(org_id, limit=1000)
    if pack.assign_to_all:
        targets = employees
    else:
        targets = [e for e in employees if e.domain_id is not None and e.domain_id in audience_domain_ids]

    already = await assignment_dao.list_assigned_employee_ids(pack_id)
    now = datetime.now(UTC)
    due_at = compute_due_at(pack, now)
    created = 0
    for employee in targets:
        if employee.id in already:
            continue
        assignment = await assignment_dao.create(
            org_id=org_id,
            doc_pack_id=pack_id,
            employee_id=employee.id,
            assigned_by=None,
            auto_assigned=True,
            status=PackAssignmentStatus.assigned,
            quiz_template_id=published.id,
            due_at=due_at,
        )
        await notify_assigned(session, org_id, employee.id, pack, assignment.id)
        created += 1
    if created:
        logger.info("auto_assign_pack pack_id=%s created=%s", pack_id, created)
    return created


async def assign_matching_packs_to_employee(session: AsyncSession, org_id: str, employee_id: str) -> int:
    """Assign every already-published track targeting this employee. Returns the number created."""
    pack_dao = DocPackDAO(session)
    employee_dao = EmployeeDAO(session)
    assignment_dao = PackAssignmentDAO(session)
    template_dao = QuizTemplateDAO(session)

    employee = await employee_dao.get_by_id_for_org(org_id, employee_id)
    if employee is None:
        return 0

    candidates = await pack_dao.list_auto_assign_targets_for_domain(org_id, employee.domain_id)
    now = datetime.now(UTC)
    created = 0
    for pack in candidates:
        published = await template_dao.get_latest_published_for_source(pack.id, QuizType.doc_pack)
        if published is None:
            continue
        existing = await assignment_dao.get_for_pack_and_employee(pack.id, employee_id)
        if existing is not None:
            continue
        assignment = await assignment_dao.create(
            org_id=org_id,
            doc_pack_id=pack.id,
            employee_id=employee_id,
            assigned_by=None,
            auto_assigned=True,
            status=PackAssignmentStatus.assigned,
            quiz_template_id=published.id,
            due_at=compute_due_at(pack, now),
        )
        await notify_assigned(session, org_id, employee_id, pack, assignment.id)
        created += 1
    if created:
        logger.info("auto_assign_employee employee_id=%s created=%s", employee_id, created)
    return created


def _member_matches_pack(pack, ft_id: str | None, repo_link_ids_with_member: set[str]) -> bool:
    """Whether a member is in a project module's union audience, given their function type and the
    set of the module's target-repo-link ids they're assigned to."""
    if pack.target_all_members:
        return True
    if ft_id is not None and ft_id in {td.project_function_type_id for td in pack.target_domains}:
        return True
    for tr in pack.target_repos:
        if tr.project_repo_id in repo_link_ids_with_member and (
            tr.project_function_type_id is None or tr.project_function_type_id == ft_id
        ):
            return True
    return False


async def assign_project_tracks_to_member(session: AsyncSession, org_id: str, project_id: str, employee_id: str) -> int:
    """Assign every published project module whose combinable targeting matches this member (additive).

    Fired when a member is added or promoted to lead. De-matching (e.g. after a domain change) is handled
    by `recompute_project_pack_audiences`. Returns the number of assignments created."""
    pack_dao = DocPackDAO(session)
    assignment_dao = PackAssignmentDAO(session)
    template_dao = QuizTemplateDAO(session)
    member_dao = ProjectMemberDAO(session)
    repo_member_dao = ProjectRepoMemberDAO(session)

    membership = await member_dao.get_for_project_and_employee(project_id, employee_id)
    ft_id = membership.function_type_id if membership else None

    packs = await pack_dao.list_for_project(org_id, project_id)
    now = datetime.now(UTC)
    created = 0
    for pack in packs:
        published = await template_dao.get_latest_published_for_source(pack.id, QuizType.doc_pack)
        if published is None:
            continue  # Draft project module — not assignable yet.
        if await assignment_dao.get_for_pack_and_employee(pack.id, employee_id) is not None:
            continue
        # Which of this pack's target repos is the member on? (only queried when the pack has repo rules)
        member_repo_links: set[str] = set()
        for tr in pack.target_repos:
            if employee_id in await repo_member_dao.list_employee_ids_for_link(tr.project_repo_id):
                member_repo_links.add(tr.project_repo_id)
        if not _member_matches_pack(pack, ft_id, member_repo_links):
            continue
        assignment = await assignment_dao.create(
            org_id=org_id,
            doc_pack_id=pack.id,
            employee_id=employee_id,
            assigned_by=None,
            auto_assigned=True,
            status=PackAssignmentStatus.assigned,
            quiz_template_id=published.id,
            due_at=compute_due_at(pack, now),
        )
        await notify_assigned(session, org_id, employee_id, pack, assignment.id)
        created += 1
    if created:
        logger.info("assign_project_tracks project_id=%s employee_id=%s created=%s", project_id, employee_id, created)
    return created


async def recompute_pack_audience(session: AsyncSession, org_id: str, pack_id: str) -> int:
    """Reconcile a project module's *auto* assignments to exactly its combinable union audience.

    Audience = (all members, if target_all_members) ∪ (members in a target domain)
               ∪ (members on a target repo, optionally narrowed to a domain).
    Creates auto_assigned=True rows for newly-matching members and deletes auto rows for members who no
    longer match. Never touches auto_assigned=False (manual) rows. No-op without a published quiz."""
    pack_dao = DocPackDAO(session)
    assignment_dao = PackAssignmentDAO(session)
    template_dao = QuizTemplateDAO(session)
    member_dao = ProjectMemberDAO(session)
    repo_member_dao = ProjectRepoMemberDAO(session)

    pack = await pack_dao.get_by_id_for_org(org_id, pack_id)
    if pack is None or pack.project_id is None:
        return 0
    published = await template_dao.get_latest_published_for_source(pack_id, QuizType.doc_pack)
    if published is None:
        return 0  # No published quiz — nothing to auto-assign against.

    members = await member_dao.list_for_project(pack.project_id)
    ft_by_emp = {m.employee_id: m.function_type_id for m in members}
    all_ids = set(ft_by_emp)

    target: set[str] = set()
    if pack.target_all_members:
        target |= all_ids
    domain_ids = {td.project_function_type_id for td in pack.target_domains}
    if domain_ids:
        target |= {e for e, ft in ft_by_emp.items() if ft in domain_ids}
    for tr in pack.target_repos:
        repo_emp_ids = await repo_member_dao.list_employee_ids_for_link(tr.project_repo_id)
        repo_emp_ids &= all_ids  # only current project members
        if tr.project_function_type_id is not None:
            repo_emp_ids = {e for e in repo_emp_ids if ft_by_emp.get(e) == tr.project_function_type_id}
        target |= repo_emp_ids

    existing = {a.employee_id: a for a in await assignment_dao.list_for_pack(org_id, pack_id)}
    now = datetime.now(UTC)
    due_at = compute_due_at(pack, now)
    created = 0
    for emp_id in target:
        if emp_id in existing:
            continue  # already assigned (manual or auto) — leave it
        assignment = await assignment_dao.create(
            org_id=org_id,
            doc_pack_id=pack_id,
            employee_id=emp_id,
            assigned_by=None,
            auto_assigned=True,
            status=PackAssignmentStatus.assigned,
            quiz_template_id=published.id,
            due_at=due_at,
        )
        await notify_assigned(session, org_id, emp_id, pack, assignment.id)
        created += 1
    for emp_id, a in existing.items():
        if a.auto_assigned and emp_id not in target:
            await assignment_dao.delete(a.id)  # no longer matches — revoke the auto assignment
    if created:
        logger.info("recompute_pack_audience pack_id=%s created=%s target=%s", pack_id, created, len(target))
    return created


async def recompute_project_pack_audiences(session: AsyncSession, org_id: str, project_id: str) -> None:
    """Full reconcile of every project module's auto audience — fired when membership, a member's domain,
    or repo assignees change (any of which can change who each module targets)."""
    pack_dao = DocPackDAO(session)
    for pack in await pack_dao.list_for_project(org_id, project_id):
        await recompute_pack_audience(session, org_id, pack.id)
