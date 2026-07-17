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
from onboard.dao.project_dao import ProjectMemberDAO
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

    published = await template_dao.get_latest_published_for_source(pack_id, QuizType.doc_pack)
    if published is None:
        return 0  # No published quiz yet — nothing to point assignments at.

    audience_domain_ids = {a.org_domain_id for a in pack.audience_domains}
    is_project_track = pack.project_id is not None
    if not is_project_track and not pack.assign_to_all and not audience_domain_ids:
        return 0  # Manual-only track.

    employees = await employee_dao.list_for_org(org_id, limit=1000)
    if is_project_track:
        # Project tracks target the project's members, not a domain/everyone audience.
        member_ids = await ProjectMemberDAO(session).list_employee_ids_for_project(pack.project_id)
        targets = [e for e in employees if e.id in member_ids]
    elif pack.assign_to_all:
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


async def assign_project_tracks_to_member(session: AsyncSession, org_id: str, project_id: str, employee_id: str) -> int:
    """Assign every published track of a project to a newly added member (Projects PRD §1). Returns count."""
    pack_dao = DocPackDAO(session)
    assignment_dao = PackAssignmentDAO(session)
    template_dao = QuizTemplateDAO(session)

    packs = await pack_dao.list_for_project(org_id, project_id)
    now = datetime.now(UTC)
    created = 0
    for pack in packs:
        published = await template_dao.get_latest_published_for_source(pack.id, QuizType.doc_pack)
        if published is None:
            continue  # Draft project track — not gating yet.
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
        logger.info("assign_project_tracks project_id=%s employee_id=%s created=%s", project_id, employee_id, created)
    return created
