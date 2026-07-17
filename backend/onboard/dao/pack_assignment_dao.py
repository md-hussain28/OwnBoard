from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.doc_pack import PackAssignment, PackAssignmentAck, PackAssignmentStatus


class PackAssignmentDAO(BaseDAO[PackAssignment]):
    model = PackAssignment

    async def get_by_id_for_org(self, org_id: str, assignment_id: str) -> PackAssignment | None:
        result = await self.session.execute(
            select(PackAssignment)
            .where(PackAssignment.id == assignment_id, PackAssignment.org_id == org_id)
            .options(selectinload(PackAssignment.acks), selectinload(PackAssignment.doc_pack))
        )
        return result.scalar_one_or_none()

    async def get_for_pack_and_employee(self, doc_pack_id: str, employee_id: str) -> PackAssignment | None:
        result = await self.session.execute(
            select(PackAssignment)
            .where(PackAssignment.doc_pack_id == doc_pack_id, PackAssignment.employee_id == employee_id)
            .options(selectinload(PackAssignment.acks))
        )
        return result.scalar_one_or_none()

    async def list_for_pack(self, org_id: str, doc_pack_id: str) -> list[PackAssignment]:
        result = await self.session.execute(
            select(PackAssignment)
            .where(PackAssignment.org_id == org_id, PackAssignment.doc_pack_id == doc_pack_id)
            .options(selectinload(PackAssignment.acks))
            .order_by(PackAssignment.assigned_at.desc())
        )
        return list(result.scalars().all())

    async def list_for_employee(self, org_id: str, employee_id: str) -> list[PackAssignment]:
        result = await self.session.execute(
            select(PackAssignment)
            .where(PackAssignment.org_id == org_id, PackAssignment.employee_id == employee_id)
            .options(selectinload(PackAssignment.acks), selectinload(PackAssignment.doc_pack))
            .order_by(PackAssignment.assigned_at.desc())
        )
        return list(result.scalars().all())

    async def list_recent_outcomes(self, org_id: str, *, limit: int = 50) -> list[PackAssignment]:
        """Passed/failed assignments for the org admin inbox, newest grade first."""
        result = await self.session.execute(
            select(PackAssignment)
            .where(
                PackAssignment.org_id == org_id,
                PackAssignment.status.in_([PackAssignmentStatus.passed, PackAssignmentStatus.failed]),
            )
            .options(selectinload(PackAssignment.doc_pack), selectinload(PackAssignment.employee))
            .order_by(PackAssignment.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def has_locking_assignment(self, doc_pack_id: str) -> bool:
        """True if any assignment for this pack has ever started its quiz (Doc Pack PRD E1, §10.12)."""
        result = await self.session.execute(
            select(PackAssignment.id).where(
                PackAssignment.doc_pack_id == doc_pack_id,
                PackAssignment.status.in_(
                    [PackAssignmentStatus.quiz_in_progress, PackAssignmentStatus.passed, PackAssignmentStatus.failed]
                ),
            )
        )
        return result.first() is not None

    async def repoint_pending_assignments(self, doc_pack_id: str, quiz_template_id: str) -> None:
        """On publish, point every not-yet-started assignment at the newly published template version."""
        await self.session.execute(
            update(PackAssignment)
            .where(
                PackAssignment.doc_pack_id == doc_pack_id,
                PackAssignment.status.in_(
                    [
                        PackAssignmentStatus.assigned,
                        PackAssignmentStatus.reading,
                        PackAssignmentStatus.ready_for_quiz,
                    ]
                ),
            )
            .values(quiz_template_id=quiz_template_id)
        )
        await self.session.commit()

    async def get_active_for_quiz_template(self, quiz_template_id: str, employee_id: str) -> PackAssignment | None:
        """Find the assignment a just-graded attempt belongs to, so its status can be updated."""
        result = await self.session.execute(
            select(PackAssignment).where(
                PackAssignment.quiz_template_id == quiz_template_id,
                PackAssignment.employee_id == employee_id,
                PackAssignment.status == PackAssignmentStatus.quiz_in_progress,
            )
        )
        return result.scalar_one_or_none()


class PackAssignmentAckDAO(BaseDAO[PackAssignmentAck]):
    model = PackAssignmentAck

    async def get_for_assignment_and_document(self, assignment_id: str, document_id: str) -> PackAssignmentAck | None:
        result = await self.session.execute(
            select(PackAssignmentAck).where(
                PackAssignmentAck.assignment_id == assignment_id, PackAssignmentAck.document_id == document_id
            )
        )
        return result.scalar_one_or_none()

    async def count_for_assignment(self, assignment_id: str) -> int:
        result = await self.session.execute(
            select(PackAssignmentAck).where(PackAssignmentAck.assignment_id == assignment_id)
        )
        return len(result.scalars().all())
