"""Shared auto-assign helper used when a hire is created, updated, or synced from Clerk."""

import logging

from onboard.services.pack_assignment.auto_assign import assign_matching_packs_to_employee

logger = logging.getLogger(__name__)


async def _safe_auto_assign(session, org_id: str, employee_id: str) -> None:
    """Fan published tracks out to a new/updated hire; never let it break the employee mutation."""
    try:
        await assign_matching_packs_to_employee(session, org_id, employee_id)
    except Exception:
        logger.exception("auto_assign_on_employee_failed org=%s employee=%s", org_id, employee_id)
