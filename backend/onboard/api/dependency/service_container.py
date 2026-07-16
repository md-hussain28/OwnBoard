from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.api.dependency.db import get_db
from onboard.services.archaeology.archaeology_service import ArchaeologyService
from onboard.services.dashboard.dashboard_service import DashboardService
from onboard.services.doc_pack.doc_pack_service import DocPackService
from onboard.services.employee.employee_service import EmployeeService
from onboard.services.expert_routing.expert_routing_service import ExpertRoutingService
from onboard.services.quiz.quiz_service import QuizService
from onboard.services.rag.rag_service import RAGService
from onboard.services.repo_ingestion.repo_ingestion_service import RepoIngestionService
from onboard.services.skill_graph.skill_graph_service import SkillGraphService


class ServiceContainer:
    """Lazily constructs domain services bound to a single request's DB session."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self._repo_ingestion: RepoIngestionService | None = None
        self._employee: EmployeeService | None = None
        self._skill_graph: SkillGraphService | None = None
        self._rag: RAGService | None = None
        self._quiz: QuizService | None = None
        self._archaeology: ArchaeologyService | None = None
        self._expert_routing: ExpertRoutingService | None = None
        self._dashboard: DashboardService | None = None
        self._doc_pack: DocPackService | None = None

    @property
    def repo_ingestion(self) -> RepoIngestionService:
        if self._repo_ingestion is None:
            self._repo_ingestion = RepoIngestionService(self.session)
        return self._repo_ingestion

    @property
    def employee(self) -> EmployeeService:
        if self._employee is None:
            self._employee = EmployeeService(self.session)
        return self._employee

    @property
    def skill_graph(self) -> SkillGraphService:
        if self._skill_graph is None:
            self._skill_graph = SkillGraphService(self.session)
        return self._skill_graph

    @property
    def rag(self) -> RAGService:
        if self._rag is None:
            self._rag = RAGService(self.session)
        return self._rag

    @property
    def quiz(self) -> QuizService:
        if self._quiz is None:
            self._quiz = QuizService(self.session)
        return self._quiz

    @property
    def archaeology(self) -> ArchaeologyService:
        if self._archaeology is None:
            self._archaeology = ArchaeologyService(self.session)
        return self._archaeology

    @property
    def expert_routing(self) -> ExpertRoutingService:
        if self._expert_routing is None:
            self._expert_routing = ExpertRoutingService(self.session)
        return self._expert_routing

    @property
    def dashboard(self) -> DashboardService:
        if self._dashboard is None:
            self._dashboard = DashboardService(self.session)
        return self._dashboard

    @property
    def doc_pack(self) -> DocPackService:
        if self._doc_pack is None:
            self._doc_pack = DocPackService(self.session)
        return self._doc_pack


def get_service_container(session: AsyncSession = Depends(get_db)) -> ServiceContainer:
    return ServiceContainer(session)
