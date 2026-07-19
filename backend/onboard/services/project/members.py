"""Project membership + readiness: the member roster, per-member gate progress, and the
member-facing project detail/track surfaces (Projects PRD §1)."""

from collections import defaultdict
from datetime import UTC, datetime

from onboard.api.schema.project.request import TrackRepoRuleInput
from onboard.api.schema.project.response import (
    MemberFeature,
    MemberSkill,
    MyProjectResponse,
    ProjectDetailResponse,
    ProjectMemberResponse,
    ProjectMemberSkillsResponse,
    ProjectTrackResponse,
    TrackRepoRule,
)
from onboard.config.constants import APP_ROLE_ADMIN
from onboard.core.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from onboard.dao.file_expertise_dao import FileExpertiseDAO
from onboard.dao.models.doc_pack import PackAssignment, PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.models.quiz_template import QuizType
from onboard.dao.quiz_template_dao import QuizTemplateDAO
from onboard.services.pack_assignment.assign_helpers import compute_due_at
from onboard.services.pack_assignment.auto_assign import (
    assign_project_tracks_to_member,
    recompute_pack_audience,
    recompute_project_pack_audiences,
)
from onboard.services.project.base import ProjectServiceBase, _readiness
from onboard.services.project.module_assign import assign_modules_to_member
from onboard.services.skill_graph.skill_graph_service import subsystem_of

_SKILLS_TOP_N = 6
_FEATURES_TOP_N = 6


class ProjectMemberMixin(ProjectServiceBase):
    async def list_my_projects(self, org_id: str, employee: Employee) -> list[MyProjectResponse]:
        """The member's own projects with their lock/progress on each (the 'My projects' surface)."""
        project_ids = set(await self.member_dao.list_project_ids_for_employee(org_id, employee.id))
        if not project_ids:
            return []
        assignments = await self.assignment_dao.list_for_employee(org_id, employee.id)
        by_project: dict[str, list[PackAssignment]] = {}
        for a in assignments:
            pid = a.doc_pack.project_id if a.doc_pack else None
            if pid in project_ids:
                by_project.setdefault(pid, []).append(a)

        out: list[MyProjectResponse] = []
        for project in await self.project_dao.list_for_org(org_id):
            if project.id not in project_ids:
                continue
            base = await self._base_response(project)
            out.append(MyProjectResponse(**base.model_dump(), readiness=_readiness(by_project.get(project.id, []))))
        return out

    async def get_project_detail(self, org_id: str, project_id: str, viewer: Employee) -> ProjectDetailResponse:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        membership = await self.member_dao.get_for_project_and_employee(project_id, viewer.id)
        is_member = membership is not None
        my_is_lead = is_member and membership.is_lead
        can_manage = is_admin or my_is_lead
        if not is_admin and not is_member:
            raise ForbiddenError("You are not a member of this project")

        tracks = await self.pack_dao.list_for_project(org_id, project_id)
        viewer_assignments = {a.doc_pack_id: a for a in await self.assignment_dao.list_for_employee(org_id, viewer.id)}
        # Targeting lookups (managers see the full targeting; members only see their own assignment state).
        ft_by_id = {t.id: t.name for t in await self.function_type_dao.list_for_project(project_id)}
        repo_link_by_id = {link.id: link for link in project.repos}
        assignments_by_pack: dict[str, list[PackAssignment]] = defaultdict(list)
        if can_manage:
            for a in await self.assignment_dao.list_for_project(org_id, project_id):
                assignments_by_pack[a.doc_pack_id].append(a)
        track_responses: list[ProjectTrackResponse] = []
        gating_for_viewer: list[PackAssignment] = []
        for pack in tracks:
            a = viewer_assignments.get(pack.id)
            if a is not None:
                gating_for_viewer.append(a)
            # A plain member only ever sees the tracks actually assigned to them — never drafts or
            # tracks scoped to other people. Managers (admin/lead) author, so they see every track.
            if not can_manage and a is None:
                continue
            track_responses.append(
                self._track_response(
                    pack, a, ft_by_id, repo_link_by_id, assignments_by_pack.get(pack.id, []), can_manage
                )
            )

        modules = await self._modules_for_viewer(org_id, project_id, viewer, can_manage=can_manage)
        my_readiness = _readiness(gating_for_viewer) if is_member else None
        base = await self._base_response(project)
        return ProjectDetailResponse(
            **base.model_dump(),
            repo_url=project.repo.url if project.repo else None,
            tracks=track_responses,
            function_types=await self._function_types(project.id),
            modules=modules,
            my_readiness=my_readiness,
            is_member=is_member,
            is_admin=is_admin,
            my_is_lead=my_is_lead,
            can_manage=can_manage,
            # Access is no longer gated by onboarding — modules track progress but never block entry.
            locked=False,
        )

    def _track_response(
        self, pack, viewer_assignment, ft_by_id, repo_link_by_id, pack_assignments, can_manage
    ) -> ProjectTrackResponse:
        """Shape one project module into its response, including its combinable targeting (managers only)."""
        domain_ids = [td.project_function_type_id for td in pack.target_domains]
        repo_rules: list[TrackRepoRule] = []
        for tr in pack.target_repos:
            link = repo_link_by_id.get(tr.project_repo_id)
            if link is None:
                continue  # rule points at a repo that's since been unlinked — skip it
            repo_rules.append(
                TrackRepoRule(
                    repo_id=link.repo_id,
                    repo_name=link.repo.name if link.repo else None,
                    domain_id=tr.project_function_type_id,
                    domain_name=ft_by_id.get(tr.project_function_type_id) if tr.project_function_type_id else None,
                )
            )
        assignee_ids = [x.employee_id for x in pack_assignments]
        manual_ids = [x.employee_id for x in pack_assignments if not x.auto_assigned]
        a = viewer_assignment
        return ProjectTrackResponse(
            id=pack.id,
            name=pack.name,
            description=pack.description,
            status=pack.status.value,
            sequence_order=pack.sequence_order,
            estimated_minutes=pack.estimated_minutes,
            due_offset_days=pack.due_offset_days,
            target_all_members=pack.target_all_members,
            domain_ids=domain_ids if can_manage else [],
            domain_names=[ft_by_id[d] for d in domain_ids if d in ft_by_id] if can_manage else [],
            repo_rules=repo_rules if can_manage else [],
            manual_employee_ids=manual_ids if can_manage else [],
            assign_scope=pack.assign_scope.value,
            assigned_count=len(assignee_ids),
            assignee_ids=assignee_ids if can_manage else [],
            assignment_id=a.id if a else None,
            my_status=a.status.value if a else "not_assigned",
            passed=a is not None and a.status == PackAssignmentStatus.passed,
        )

    async def list_project_members(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        if not is_admin and await self.member_dao.get_for_project_and_employee(project_id, viewer.id) is None:
            raise ForbiddenError("You are not a member of this project")
        return await self._build_member_panel(org_id, project.id)

    async def _build_member_panel(self, org_id: str, project_id: str) -> list[ProjectMemberResponse]:
        members = await self.member_dao.list_for_project(project_id)
        assignments = await self.assignment_dao.list_for_project(org_id, project_id)
        by_employee: dict[str, list[PackAssignment]] = {}
        for a in assignments:
            by_employee.setdefault(a.employee_id, []).append(a)

        rows: list[ProjectMemberResponse] = []
        for m in members:
            emp = m.employee
            readiness = _readiness(by_employee.get(emp.id, []))
            rows.append(
                ProjectMemberResponse(
                    employee_id=emp.id,
                    name=emp.name,
                    role=emp.role,
                    app_role=emp.app_role,
                    github_handle=emp.github_handle,
                    domain_name=emp.domain.name if emp.domain else None,
                    is_lead=m.is_lead,
                    function_type_id=m.function_type_id,
                    function_type_name=m.function_type.name if m.function_type else None,
                    readiness=readiness,
                    is_go_to=readiness.total_tracks > 0 and not readiness.locked,
                )
            )
        # Leads first, then go-to people, then the rest by name.
        rows.sort(key=lambda r: (not r.is_lead, not r.is_go_to, r.name.lower()))
        return rows

    async def add_members(
        self,
        org_id: str,
        project_id: str,
        employee_ids: list[str],
        added_by: str | None,
        viewer: Employee,
        *,
        function_type_id: str | None = None,
    ) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        if function_type_id is not None:
            if await self.function_type_dao.get_by_id_for_project(project_id, function_type_id) is None:
                raise ValidationError(f"Function type {function_type_id} not found in this project")
        for employee_id in dict.fromkeys(employee_ids):  # de-dupe, preserve order
            employee = await self.employee_dao.get_by_id_for_org(org_id, employee_id)
            if employee is None:
                raise ValidationError(f"Employee {employee_id} not found")
            if employee.app_role == APP_ROLE_ADMIN:
                raise ValidationError("Admins can't be added as project members")
            if await self.member_dao.get_for_project_and_employee(project_id, employee_id) is not None:
                continue  # already a member — idempotent
            await self.member_dao.create(
                org_id=org_id,
                project_id=project_id,
                employee_id=employee_id,
                function_type_id=function_type_id,
                added_by=added_by,
            )
            # Fan out this project's published tracks (gating) and function-matched modules to the new member.
            await assign_project_tracks_to_member(self.session, org_id, project_id, employee_id)
            await assign_modules_to_member(self.session, org_id, project_id, employee_id)
        return await self._build_member_panel(org_id, project.id)

    async def update_member(
        self,
        org_id: str,
        project_id: str,
        employee_id: str,
        viewer: Employee,
        *,
        function_type_id: str | None = None,
        clear_function_type: bool = False,
        is_lead: bool | None = None,
    ) -> list[ProjectMemberResponse]:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        membership = await self.member_dao.get_for_project_and_employee(project_id, employee_id)
        if membership is None:
            raise NotFoundError(f"Employee {employee_id} is not a member of project {project_id}")

        fields: dict = {}
        function_changed = False
        if clear_function_type:
            fields["function_type_id"] = None
            function_changed = membership.function_type_id is not None
        elif function_type_id is not None:
            if await self.function_type_dao.get_by_id_for_project(project_id, function_type_id) is None:
                raise ValidationError(f"Function type {function_type_id} not found in this project")
            fields["function_type_id"] = function_type_id
            function_changed = membership.function_type_id != function_type_id
        if is_lead is not None:
            fields["is_lead"] = is_lead
        if fields:
            await self.member_dao.update(membership.id, **fields)
        if is_lead:
            # Only one team lead per project — promoting this member demotes any previous lead.
            await self._enforce_single_lead(project_id, employee_id)
        if function_changed:
            # Additive: assign dev modules for the new function. (Existing assignments are left intact.)
            await assign_modules_to_member(self.session, org_id, project_id, employee_id)
            # Onboarding modules use domain-aware union targeting — reconcile (adds and removes) so the
            # member gains newly-matching modules and loses ones their old domain matched.
            await recompute_project_pack_audiences(self.session, org_id, project_id)
        return await self._build_member_panel(org_id, project.id)

    async def remove_member(self, org_id: str, project_id: str, employee_id: str, viewer: Employee) -> None:
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        membership = await self.member_dao.get_for_project_and_employee(project_id, employee_id)
        if membership is None:
            raise NotFoundError(f"Employee {employee_id} is not a member of project {project_id}")
        await self.member_dao.delete(membership.id)
        # Revoke the member's assignments for this project's tracks so their gate/readiness don't linger
        # (general/company tracks and other projects' tracks are untouched — the query is project-scoped).
        await self.assignment_dao.delete_for_project_and_employee(org_id, project_id, employee_id)

    async def list_project_tracks(self, org_id: str, project_id: str, viewer: Employee) -> list[ProjectTrackResponse]:
        detail = await self.get_project_detail(org_id, project_id, viewer)
        return detail.tracks

    async def get_member_skills(
        self, org_id: str, project_id: str, viewer: Employee
    ) -> list[ProjectMemberSkillsResponse]:
        """Per-member skills + features derived from commit history across the project's linked repos,
        matched to employees by GitHub handle. Visible to any member of the project (team view)."""
        await self._get_project(org_id, project_id)  # 404 if not in this org
        is_admin = viewer.app_role == APP_ROLE_ADMIN
        if not is_admin and await self.member_dao.get_for_project_and_employee(project_id, viewer.id) is None:
            raise ForbiddenError("You are not a member of this project")

        # Gather every file_expertise row across the project's repos, keyed by contributor GitHub handle.
        fexp_dao = FileExpertiseDAO(self.session)
        repo_names: dict[str, str | None] = {}
        by_handle: dict[str, list] = defaultdict(list)
        for link in await self.repo_link_dao.list_for_project(project_id):
            repo_names[link.repo_id] = link.repo.name if link.repo else None
            for row in await fexp_dao.list_for_repo(link.repo_id):
                handle = row.contributor.github_handle if row.contributor else None
                if handle:
                    by_handle[handle.lower()].append((link.repo_id, row))

        rows_out: list[ProjectMemberSkillsResponse] = []
        for m in await self.member_dao.list_for_project(project_id):
            emp = m.employee
            handle = emp.github_handle
            entries = by_handle.get(handle.lower(), []) if handle else []
            rows_out.append(self._member_skills_response(emp, entries, repo_names))
        # Most-active contributors first; unmatched members sink to the bottom.
        rows_out.sort(key=lambda r: (not r.matched, -r.total_commits, r.name.lower()))
        return rows_out

    def _member_skills_response(self, emp, entries, repo_names: dict[str, str | None]) -> ProjectMemberSkillsResponse:
        subsystem: dict[str, list[float]] = defaultdict(lambda: [0.0, 0])  # name -> [score_sum, commit_sum]
        total_commits = 0
        for _repo_id, row in entries:
            sub = subsystem_of(row.file_path)
            subsystem[sub][0] += row.revert_adjusted_score
            subsystem[sub][1] += row.commit_count
            total_commits += row.commit_count
        skills = [
            MemberSkill(name=name, score=round(score, 3), commit_count=commits)
            for name, (score, commits) in sorted(subsystem.items(), key=lambda kv: kv[1][0], reverse=True)
        ][:_SKILLS_TOP_N]
        top_files = sorted(entries, key=lambda e: e[1].revert_adjusted_score, reverse=True)[:_FEATURES_TOP_N]
        features = [
            MemberFeature(
                file_path=row.file_path,
                repo_name=repo_names.get(repo_id),
                commit_count=row.commit_count,
                last_commit_at=row.last_commit_at,
            )
            for repo_id, row in top_files
        ]
        return ProjectMemberSkillsResponse(
            employee_id=emp.id,
            name=emp.name,
            github_handle=emp.github_handle,
            matched=bool(entries),
            total_commits=total_commits,
            skills=skills,
            features=features,
        )

    async def update_track_assignment(
        self,
        org_id: str,
        project_id: str,
        track_id: str,
        viewer: Employee,
        *,
        target_all_members: bool,
        domain_ids: list[str],
        repo_rules: list[TrackRepoRuleInput],
        manual_employee_ids: list[str],
    ) -> ProjectTrackResponse:
        """Set a module's combinable audience: the union of everyone (target_all_members), the given
        domains, the repo(+domain) rules, and the hand-picked manual assignees (project members only)."""
        project = await self._get_project(org_id, project_id)
        await self._assert_can_manage(project, viewer)
        pack = await self.pack_dao.get_by_id_for_org(org_id, track_id)
        if pack is None or pack.project_id != project_id:
            raise NotFoundError(f"Module {track_id} not found")

        # Validate + resolve targeting rules (repo_id → ProjectRepo link id; dedupe repo rules).
        domain_ids = list(dict.fromkeys(domain_ids))
        await self._validate_function_type_ids(project_id, domain_ids)
        resolved_repo_rules: list[tuple[str, str | None]] = []
        seen: set[tuple[str, str | None]] = set()
        for rule in repo_rules:
            link = await self.repo_link_dao.get_for_project_and_repo(project_id, rule.repo_id)
            if link is None:
                raise ValidationError(f"Repo {rule.repo_id} is not linked to this project")
            if rule.domain_id is not None:
                await self._validate_function_type_ids(project_id, [rule.domain_id])
            key = (link.id, rule.domain_id)
            if key not in seen:
                seen.add(key)
                resolved_repo_rules.append(key)

        # Persist the rules, then reconcile the auto audience + manual roster.
        await self.pack_dao.update(pack.id, target_all_members=target_all_members)
        await self.target_domain_dao.replace_for_pack(org_id, pack.id, domain_ids)
        await self.target_repo_dao.replace_for_pack(org_id, pack.id, resolved_repo_rules)
        await recompute_pack_audience(self.session, org_id, pack.id)
        await self._set_manual_assignees(org_id, project_id, pack, viewer, list(manual_employee_ids))

        detail = await self.get_project_detail(org_id, project_id, viewer)
        for t in detail.tracks:
            if t.id == track_id:
                return t
        raise NotFoundError(f"Module {track_id} not found")

    async def _set_manual_assignees(
        self, org_id: str, project_id: str, pack, viewer: Employee, employee_ids: list[str]
    ) -> None:
        """Make the module's *manual* (auto_assigned=False) assignees exactly `employee_ids` (project
        members only). Auto assignments produced by the targeting rules are left untouched."""
        member_ids = await self.member_dao.list_employee_ids_for_project(project_id)
        target = {e for e in employee_ids if e in member_ids}
        existing = await self.assignment_dao.list_for_pack(org_id, pack.id)
        by_emp = {a.employee_id: a for a in existing}
        manual_current = {a.employee_id for a in existing if not a.auto_assigned}
        template_dao = QuizTemplateDAO(self.session)
        published = await template_dao.get_latest_published_for_source(pack.id, QuizType.doc_pack)
        due_at = compute_due_at(pack, datetime.now(UTC))
        for emp_id in target:
            if emp_id in by_emp:
                continue  # already assigned (auto or manual) — leave it
            await self.assignment_dao.create(
                org_id=org_id,
                doc_pack_id=pack.id,
                employee_id=emp_id,
                assigned_by=viewer.id,
                auto_assigned=False,
                status=PackAssignmentStatus.assigned,
                quiz_template_id=published.id if published else None,
                due_at=due_at,
            )
        for emp_id in manual_current - target:
            a = by_emp.get(emp_id)
            if a is not None:
                await self.assignment_dao.delete(a.id)  # remove hand-picked assignment
