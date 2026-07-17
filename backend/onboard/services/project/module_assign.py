"""Function-based module auto-assignment (Projects PRD §modules).

Symmetric to the track auto-assign engine, but keyed on a member's *project function* instead of their
org domain, and additive/idempotent (never revokes, re-running is a no-op):

- `assign_module_to_audience` — fired when a module is activated or its function tags change: assign it
  to every current member whose function matches (untyped module → every member).
- `assign_modules_to_member` — fired when a member is added or their function changes: assign every
  active module that targets their function (plus untyped modules).

Unlike tracks, modules have no quiz/gate, so there's no "published" precondition — an *active* module
is assignable immediately.
"""

from onboard.core.common.logger import get_logger
from onboard.dao.models.project_module import ProjectModuleAssignmentStatus, ProjectModuleStatus
from onboard.dao.project_dao import ProjectMemberDAO
from onboard.dao.project_module_dao import (
    ProjectModuleAssignmentDAO,
    ProjectModuleDAO,
    ProjectModuleTypeDAO,
)

logger = get_logger("onboard.module_assign")


async def assign_module_to_audience(session, org_id: str, module_id: str) -> int:
    """Assign an active module to every current member whose function matches. Returns count created."""
    module_dao = ProjectModuleDAO(session)
    type_dao = ProjectModuleTypeDAO(session)
    member_dao = ProjectMemberDAO(session)
    assignment_dao = ProjectModuleAssignmentDAO(session)

    module = await module_dao.get_by_id_for_org(org_id, module_id)
    if module is None or module.status != ProjectModuleStatus.active:
        return 0

    type_ids = await type_dao.list_function_type_ids_for_module(module_id)
    members = await member_dao.list_for_project(module.project_id)
    if type_ids:
        targets = [m for m in members if m.function_type_id is not None and m.function_type_id in type_ids]
    else:
        targets = members  # untyped module → everyone on the project

    already = await assignment_dao.list_assigned_employee_ids(module_id)
    created = 0
    for m in targets:
        if m.employee_id in already:
            continue
        await assignment_dao.create(
            org_id=org_id,
            module_id=module_id,
            employee_id=m.employee_id,
            assigned_by=None,
            auto_assigned=True,
            status=ProjectModuleAssignmentStatus.assigned,
        )
        created += 1
    if created:
        logger.info("assign_module_to_audience module_id=%s created=%s", module_id, created)
    return created


async def assign_modules_to_member(session, org_id: str, project_id: str, employee_id: str) -> int:
    """Assign every active module targeting this member's function (plus untyped). Returns count created."""
    module_dao = ProjectModuleDAO(session)
    member_dao = ProjectMemberDAO(session)
    assignment_dao = ProjectModuleAssignmentDAO(session)

    membership = await member_dao.get_for_project_and_employee(project_id, employee_id)
    if membership is None:
        return 0
    function_id = membership.function_type_id

    modules = await module_dao.list_for_project(project_id, active_only=True)
    created = 0
    for module in modules:
        type_ids = {link.function_type_id for link in module.type_links}
        matches = (not type_ids) or (function_id is not None and function_id in type_ids)
        if not matches:
            continue
        existing = await assignment_dao.get_for_module_and_employee(module.id, employee_id)
        if existing is not None:
            continue
        await assignment_dao.create(
            org_id=org_id,
            module_id=module.id,
            employee_id=employee_id,
            assigned_by=None,
            auto_assigned=True,
            status=ProjectModuleAssignmentStatus.assigned,
        )
        created += 1
    if created:
        logger.info(
            "assign_modules_to_member project_id=%s employee_id=%s created=%s", project_id, employee_id, created
        )
    return created
