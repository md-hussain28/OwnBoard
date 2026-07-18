from sqlalchemy import select
from sqlalchemy.orm import selectinload

from onboard.dao.base_dao import BaseDAO
from onboard.dao.models.employee import Employee
from onboard.dao.models.project import (
    Project,
    ProjectDocType,
    ProjectDocumentType,
    ProjectFunctionType,
    ProjectMember,
    ProjectRepo,
    ProjectRepoMember,
)


class ProjectDAO(BaseDAO[Project]):
    model = Project

    async def list_for_org(self, org_id: str, limit: int = 200, offset: int = 0) -> list[Project]:
        result = await self.session.execute(
            select(Project)
            .where(Project.org_id == org_id)
            .options(
                selectinload(Project.repo),
                selectinload(Project.repos).selectinload(ProjectRepo.repo),
                selectinload(Project.repos).selectinload(ProjectRepo.members).selectinload(ProjectRepoMember.employee),
            )
            .order_by(Project.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def get_by_id_for_org(self, org_id: str, project_id: str) -> Project | None:
        result = await self.session.execute(
            select(Project)
            .where(Project.id == project_id, Project.org_id == org_id)
            .options(
                selectinload(Project.repo),
                selectinload(Project.repos).selectinload(ProjectRepo.repo),
                selectinload(Project.repos).selectinload(ProjectRepo.members).selectinload(ProjectRepoMember.employee),
            )
        )
        return result.scalar_one_or_none()


class ProjectRepoDAO(BaseDAO[ProjectRepo]):
    model = ProjectRepo

    async def list_for_project(self, project_id: str) -> list[ProjectRepo]:
        result = await self.session.execute(
            select(ProjectRepo)
            .where(ProjectRepo.project_id == project_id)
            .options(selectinload(ProjectRepo.repo))
            .order_by(ProjectRepo.is_primary.desc(), ProjectRepo.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_for_project_and_repo(self, project_id: str, repo_id: str) -> ProjectRepo | None:
        result = await self.session.execute(
            select(ProjectRepo).where(ProjectRepo.project_id == project_id, ProjectRepo.repo_id == repo_id)
        )
        return result.scalar_one_or_none()


class ProjectFunctionTypeDAO(BaseDAO[ProjectFunctionType]):
    model = ProjectFunctionType

    async def list_for_project(self, project_id: str) -> list[ProjectFunctionType]:
        result = await self.session.execute(
            select(ProjectFunctionType)
            .where(ProjectFunctionType.project_id == project_id)
            .order_by(ProjectFunctionType.sort_order.asc(), ProjectFunctionType.name.asc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_project(self, project_id: str, function_type_id: str) -> ProjectFunctionType | None:
        result = await self.session.execute(
            select(ProjectFunctionType).where(
                ProjectFunctionType.id == function_type_id, ProjectFunctionType.project_id == project_id
            )
        )
        return result.scalar_one_or_none()


class ProjectMemberDAO(BaseDAO[ProjectMember]):
    model = ProjectMember

    async def list_for_project(self, project_id: str) -> list[ProjectMember]:
        result = await self.session.execute(
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id)
            .options(
                selectinload(ProjectMember.employee).selectinload(Employee.domain),
                selectinload(ProjectMember.function_type),
            )
            .order_by(ProjectMember.created_at.asc())
        )
        return list(result.scalars().all())

    async def list_employee_ids_for_project(self, project_id: str) -> set[str]:
        result = await self.session.execute(
            select(ProjectMember.employee_id).where(ProjectMember.project_id == project_id)
        )
        return set(result.scalars().all())

    async def list_project_ids_for_employee(self, org_id: str, employee_id: str) -> list[str]:
        result = await self.session.execute(
            select(ProjectMember.project_id).where(
                ProjectMember.org_id == org_id, ProjectMember.employee_id == employee_id
            )
        )
        return list(result.scalars().all())

    async def get_for_project_and_employee(self, project_id: str, employee_id: str) -> ProjectMember | None:
        result = await self.session.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id, ProjectMember.employee_id == employee_id
            )
        )
        return result.scalar_one_or_none()

    async def get_lead_for_project(self, project_id: str) -> ProjectMember | None:
        """The single team lead of a project (at most one is enforced by the service)."""
        result = await self.session.execute(
            select(ProjectMember)
            .where(ProjectMember.project_id == project_id, ProjectMember.is_lead.is_(True))
            .options(selectinload(ProjectMember.employee))
            .order_by(ProjectMember.created_at.asc())
        )
        return result.scalars().first()

    async def count_for_project(self, project_id: str) -> int:
        return len(await self.list_employee_ids_for_project(project_id))


class ProjectDocTypeDAO(BaseDAO[ProjectDocType]):
    model = ProjectDocType

    async def list_for_project(self, project_id: str) -> list[ProjectDocType]:
        result = await self.session.execute(
            select(ProjectDocType)
            .where(ProjectDocType.project_id == project_id)
            .order_by(ProjectDocType.sort_order.asc(), ProjectDocType.name.asc())
        )
        return list(result.scalars().all())

    async def get_by_id_for_project(self, project_id: str, doc_type_id: str) -> ProjectDocType | None:
        result = await self.session.execute(
            select(ProjectDocType).where(ProjectDocType.id == doc_type_id, ProjectDocType.project_id == project_id)
        )
        return result.scalar_one_or_none()


class ProjectDocumentTypeDAO(BaseDAO[ProjectDocumentType]):
    model = ProjectDocumentType

    async def list_for_documents(self, document_ids: list[str]) -> list[ProjectDocumentType]:
        if not document_ids:
            return []
        result = await self.session.execute(
            select(ProjectDocumentType).where(ProjectDocumentType.document_id.in_(document_ids))
        )
        return list(result.scalars().all())

    async def list_for_document(self, document_id: str) -> list[ProjectDocumentType]:
        result = await self.session.execute(
            select(ProjectDocumentType).where(ProjectDocumentType.document_id == document_id)
        )
        return list(result.scalars().all())


class ProjectRepoMemberDAO(BaseDAO[ProjectRepoMember]):
    model = ProjectRepoMember

    async def get_for_link_and_employee(self, project_repo_id: str, employee_id: str) -> ProjectRepoMember | None:
        result = await self.session.execute(
            select(ProjectRepoMember).where(
                ProjectRepoMember.project_repo_id == project_repo_id,
                ProjectRepoMember.employee_id == employee_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_repo_ids_for_employee(self, project_id: str, employee_id: str) -> list[str]:
        """The repo ids (within a project) a given employee is assigned to work on."""
        result = await self.session.execute(
            select(ProjectRepo.repo_id)
            .join(ProjectRepoMember, ProjectRepoMember.project_repo_id == ProjectRepo.id)
            .where(ProjectRepo.project_id == project_id, ProjectRepoMember.employee_id == employee_id)
        )
        return list(result.scalars().all())
