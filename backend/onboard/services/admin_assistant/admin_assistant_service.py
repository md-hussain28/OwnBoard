"""Agentic admin "AI Assistant" — org-wide onboarding analytics + real admin actions (PRD §6.3).

Unlike `ProjectChatService` (read-only, fire-and-forget "display tools"), this assistant runs a genuine
tool-execution loop: it calls REAL backend services to fetch stats and to perform admin mutations
(add a member to a project, create an employee, assign onboarding), feeds each tool's result back to the
model, and lets it narrate + render the outcome with the same generative-UI component catalog.

Two tool families:
- ACTION tools (`admin_assistant.tools.ACTION_TOOLS`) — executed server-side; their JSON result is fed
  back to the model. Read actions (`listProjects`, `getOnboardingStats`, …) resolve names→ids and
  answer analytics. Write actions (`addProjectMember`, `createEmployee`, `assignOnboarding`, …) mutate data.
- DISPLAY tools — the generative-UI catalog reused verbatim from `project_chat.tools.TOOLS`; the
  model calls these to render metrics/charts/tables/callouts; the tool `input` IS the render payload.

Every mutation is authorized through the underlying service's `viewer`/`actor` checks, and the endpoint
itself is admin-gated. `stream_answer` yields the ProjectChatService event vocabulary (`text` /
`component` / `error`) plus `action` events — one `running` and one `done` per executed action tool —
so the UI can show the agent's real steps live instead of a generic spinner.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import OnboardError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.services.admin_assistant.prompting import (
    DEFAULT_QUIP,
    OFFTOPIC_ACTIONS,
    TRIAGE_SYSTEM_PROMPT,
    build_system_prompt,
)
from onboard.services.admin_assistant.tools import (
    ACTION_TITLES,
    ACTION_TOOL_NAMES,
    ACTION_TOOLS,
    WRITE_ACTION_NAMES,
)
from onboard.services.employee.employee_service import EmployeeService
from onboard.services.pack_assignment.pack_assignment_service import PackAssignmentService
from onboard.services.project.project_service import ProjectService
from onboard.services.project_chat.tools import TOOLS as _DISPLAY_TOOLS

_MAX_TOOL_ROUNDS = 5
_MAX_HISTORY_TURNS = 8
_RESULT_CHAR_LIMIT = 6000

_TOOLS = ACTION_TOOLS + _DISPLAY_TOOLS


class _Triage(BaseModel):
    """Cheap gatekeeper verdict — shields the expensive tool loop from off-topic / injection input."""

    on_topic: bool
    quip: str = ""


class AdminAssistantService:
    """Agentic, tool-executing admin assistant over org onboarding data and admin actions."""

    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.projects = ProjectService(session)
        self.employees = EmployeeService(session)
        self.assignments = PackAssignmentService(session)
        self.employee_dao = EmployeeDAO(session)
        self.doc_pack_dao = DocPackDAO(session)
        self.pack_assignment_dao = PackAssignmentDAO(session)

    async def stream_answer(
        self,
        org_id: str,
        actor: Employee,
        question: str,
        *,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[dict]:
        """Run the tool-execution loop, streaming text + generative components + action results."""
        # Cheap gatekeeper first: decline off-topic / prompt-injection input with a witty one-liner
        # BEFORE spinning up the multi-round tool loop, so junk never runs up the OpenAI bill.
        triage = await self._triage(question, history or [])
        if triage is not None and not triage.on_topic:
            yield {"type": "text", "text": (triage.quip or "").strip() or DEFAULT_QUIP}
            yield {"type": "component", "id": "offtopic-actions", "name": "showActions", "input": OFFTOPIC_ACTIONS}
            return

        messages: list[dict[str, Any]] = [{"role": "system", "content": await self._build_system_prompt(org_id, actor)}]
        for turn in (history or [])[-_MAX_HISTORY_TURNS:]:
            role, content = turn.get("role"), (turn.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})

        model = self.llm.assistant_model

        try:
            for _round in range(_MAX_TOOL_ROUNDS):
                tool_calls: list[dict[str, Any]] = []
                # Low temperature — this is an action-taking agent; we want deterministic, grounded
                # tool use, not creative narration that invents people, ids, or "success".
                async for event in self.llm.stream_chat_tools(messages, _TOOLS, model=model, temperature=0.1):
                    if event["type"] == "text":
                        if event["text"]:
                            yield {"type": "text", "text": event["text"]}
                    elif event["type"] == "tool_calls":
                        tool_calls = event["tool_calls"]

                if not tool_calls:
                    break

                messages.append(
                    {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": call["id"],
                                "type": "function",
                                "function": {
                                    "name": call["name"],
                                    "arguments": json.dumps(call["arguments"]),
                                },
                            }
                            for call in tool_calls
                            if call.get("id") and call.get("name")
                        ],
                    }
                )

                for call in tool_calls:
                    name, cid = call.get("name"), call.get("id")
                    args = call.get("arguments") or {}
                    if not name or not cid:
                        continue
                    if name in ACTION_TOOL_NAMES:
                        kind = "write" if name in WRITE_ACTION_NAMES else "read"
                        # Announce the step BEFORE it runs so the UI shows the agent working live,
                        # then resolve the SAME step to done/failed once the tool returns.
                        yield {
                            "type": "action",
                            "id": cid,
                            "name": name,
                            "kind": kind,
                            "phase": "running",
                            "title": ACTION_TITLES.get(name, name),
                        }
                        result = await self._execute_action(org_id, actor, name, args)
                        ok = bool(result.get("ok"))
                        yield {
                            "type": "action",
                            "id": cid,
                            "name": name,
                            "kind": kind,
                            "phase": "done",
                            "title": ACTION_TITLES.get(name, name),
                            "ok": ok,
                            "summary": self._action_summary(name, result)
                            if ok
                            else str(result.get("error") or "Failed"),
                        }
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": cid,
                                "content": json.dumps(result)[:_RESULT_CHAR_LIMIT],
                            }
                        )
                    else:
                        # Display tool — render client-side; the input is the payload.
                        yield {"type": "component", "id": cid, "name": name, "input": args}
                        messages.append({"role": "tool", "tool_call_id": cid, "content": "rendered"})
        except Exception as exc:  # keep the stream resilient — surface, don't crash
            yield {"type": "error", "message": str(exc)}

    # ── Guardrail: cheap off-topic / injection gate ─────────────────────────────
    async def _triage(self, question: str, history: list[dict[str, str]]) -> _Triage | None:
        """Classify the latest message on the FAST/cheap model before the tool loop runs.

        Returns a verdict, or None on any failure — we fail OPEN (treat as on-topic) so a triage
        hiccup never blocks a legitimate admin. Off-topic / jailbreak input is short-circuited with a
        witty refusal upstream, which is the whole point: it keeps the expensive agent off the meter.
        """
        recent = "\n".join(
            f"{t.get('role')}: {(t.get('content') or '').strip()[:200]}"
            for t in history[-4:]
            if t.get("role") in ("user", "assistant") and (t.get("content") or "").strip()
        )
        user = (f"Recent turns:\n{recent}\n\n" if recent else "") + f"Latest admin message:\n{question}"
        try:
            return await self.llm.parse(
                [{"role": "system", "content": TRIAGE_SYSTEM_PROMPT}, {"role": "user", "content": user}],
                _Triage,
            )
        except Exception:  # noqa: BLE001 — fail open: never block a real admin over a triage error
            return None

    # ── Action execution ───────────────────────────────────────────────────────
    async def _execute_action(self, org_id: str, actor: Employee, name: str, args: dict[str, Any]) -> dict[str, Any]:
        """Dispatch one action tool. Business/validation errors are returned (not raised) so the model
        can explain them to the admin instead of crashing the stream."""
        try:
            if name == "listProjects":
                projects = await self.projects.list_projects(org_id)
                return {"ok": True, "projects": [self._project_row(p) for p in projects]}

            if name == "listEmployees":
                people = await self.employee_dao.list_for_org(org_id, limit=200)
                return {"ok": True, "employees": [self._employee_row(e) for e in people]}

            if name == "listTracks":
                packs = await self.doc_pack_dao.list_for_org(org_id, limit=200)
                return {
                    "ok": True,
                    "tracks": [
                        {
                            "id": p.id,
                            "name": p.name,
                            "scope": "project" if p.project_id else "general",
                            "project_id": p.project_id,
                        }
                        for p in packs
                    ],
                }

            if name == "getOnboardingStats":
                return {"ok": True, "stats": await self._cohort_summary(org_id)}

            if name == "getProjectOnboardingStats":
                return {"ok": True, "stats": await self._project_stats(org_id, args["projectId"])}

            if name == "getProjectMembers":
                members = await self.projects.list_project_members(org_id, args["projectId"], actor)
                return {"ok": True, "members": [self._member_row(m) for m in members]}

            if name == "listRecentOutcomes":
                limit = min(int(args.get("limit") or 20), 50)
                outcomes = await self.assignments.list_recent_outcomes(org_id, limit=limit)
                return {
                    "ok": True,
                    "outcomes": [
                        {
                            "employee_id": a.employee_id,
                            "status": a.status.value if hasattr(a.status, "value") else str(a.status),
                            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                        }
                        for a in outcomes
                    ],
                }

            if name == "addProjectMember":
                members = await self.projects.add_members(
                    org_id,
                    args["projectId"],
                    [args["employeeId"]],
                    added_by=actor.id,
                    viewer=actor,
                )
                return {
                    "ok": True,
                    "action": "added_member",
                    "members": [self._member_row(m) for m in members],
                }

            if name == "removeProjectMember":
                await self.projects.remove_member(org_id, args["projectId"], args["employeeId"], actor)
                return {"ok": True, "action": "removed_member", "employee_id": args["employeeId"]}

            if name == "createEmployee":
                employee = await self.employees.create_employee(
                    org_id,
                    args["name"],
                    args.get("role"),
                    args.get("githubHandle"),
                    app_role=args.get("appRole") or "member",
                )
                return {"ok": True, "action": "created_employee", "employee": self._employee_row(employee)}

            if name == "assignOnboarding":
                created = await self.assignments.create_assignments(
                    org_id, args["packId"], list(args.get("employeeIds") or []), assigned_by=actor.id
                )
                return {"ok": True, "action": "assigned_onboarding", "assigned_count": len(created)}

            return {"ok": False, "error": f"Unknown action {name}"}
        except OnboardError as exc:
            return {"ok": False, "error": str(exc)}
        except Exception as exc:  # noqa: BLE001 — surface any failure to the model as a tool result
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    @staticmethod
    def _action_summary(name: str, result: dict[str, Any]) -> str:
        """One-line, human summary of what a successful action produced — shown on the agent step.

        Read actions summarize what they found; write actions restate the real change (grounded in
        the tool result, never invented), so the activity log is verifiable at a glance."""
        if name == "listProjects":
            return f"Found {len(result.get('projects') or [])} projects"
        if name == "listEmployees":
            return f"Found {len(result.get('employees') or [])} people"
        if name == "listTracks":
            return f"Found {len(result.get('tracks') or [])} tracks"
        if name in ("getOnboardingStats", "getProjectOnboardingStats"):
            stats = result.get("stats") or {}
            return (
                f"{stats.get('passed', 0)} passed · {stats.get('failed', 0)} failed "
                f"· {stats.get('completion_pct', 0)}% complete"
            )
        if name == "getProjectMembers":
            return f"Read {len(result.get('members') or [])} members"
        if name == "listRecentOutcomes":
            return f"Read {len(result.get('outcomes') or [])} recent outcomes"
        if name == "addProjectMember":
            members = result.get("members") or []
            who = members[-1].get("name") if members else None
            return f"Added {who} to the project" if who else "Added member to the project"
        if name == "removeProjectMember":
            return "Removed member from the project"
        if name == "createEmployee":
            emp = result.get("employee") or {}
            return f"Created {emp.get('name')}" if emp.get("name") else "Created new person"
        if name == "assignOnboarding":
            return f"Assigned track to {result.get('assigned_count', 0)} people"
        return "Done"

    # ── Serialization helpers (keep payloads small for the small host) ─────────
    @staticmethod
    def _project_row(p: Any) -> dict[str, Any]:
        return {
            "id": p.id,
            "name": p.name,
            "status": getattr(p, "status", None),
            "member_count": getattr(p, "member_count", None),
            "track_count": getattr(p, "track_count", None),
            "lead_name": getattr(p, "lead_name", None),
        }

    @staticmethod
    def _employee_row(e: Any) -> dict[str, Any]:
        return {
            "id": e.id,
            "name": e.name,
            "role": getattr(e, "role", None),
            "app_role": getattr(e, "app_role", None),
            "github_handle": getattr(e, "github_handle", None),
        }

    @staticmethod
    def _member_row(m: Any) -> dict[str, Any]:
        readiness = getattr(m, "readiness", None)
        return {
            "employee_id": m.employee_id,
            "name": m.name,
            "role": m.role,
            "app_role": m.app_role,
            "is_lead": m.is_lead,
            "is_go_to": m.is_go_to,
            "readiness": readiness.model_dump(mode="json") if hasattr(readiness, "model_dump") else readiness,
        }

    async def _cohort_summary(self, org_id: str) -> dict[str, Any]:
        data = await self.assignments.get_cohort_dashboard(org_id)
        failed = sum(
            1 for row in data.employees for status in row.cells.values() if status == PackAssignmentStatus.failed
        )
        return {
            "total_assignments": data.total_assignments,
            "passed": data.passed_assignments,
            "failed": failed,
            "overdue": data.overdue_assignments,
            "not_started": data.not_started_assignments,
            "in_progress": max(
                0,
                data.total_assignments - data.passed_assignments - failed - data.not_started_assignments,
            ),
            "completion_pct": data.completion_pct,
            "avg_days_to_onboard": data.avg_days_to_onboard,
            "people_count": len(data.employees),
            "fully_onboarded": data.fully_onboarded_count,
            "tracks": [{"id": t.id, "name": t.name} for t in data.tracks],
        }

    async def _project_stats(self, org_id: str, project_id: str) -> dict[str, Any]:
        assignments = await self.pack_assignment_dao.list_for_project(org_id, project_id)
        counts: dict[str, int] = {}
        for a in assignments:
            key = a.status.value if hasattr(a.status, "value") else str(a.status)
            counts[key] = counts.get(key, 0) + 1
        total = len(assignments)
        passed = counts.get(PackAssignmentStatus.passed.value, 0)
        failed = counts.get(PackAssignmentStatus.failed.value, 0)
        return {
            "project_id": project_id,
            "total_assignments": total,
            "passed": passed,
            "failed": failed,
            "by_status": counts,
            "completion_pct": round(passed / total * 100) if total else 0,
        }

    async def _build_system_prompt(self, org_id: str, actor: Employee) -> str:
        """Front-load org-wide facts so the assistant knows the organization overall before any tool call."""
        try:
            projects = await self.projects.list_projects(org_id)
        except Exception:  # noqa: BLE001 — prompt context is best-effort
            projects = []
        try:
            stats = await self._cohort_summary(org_id)
        except Exception:  # noqa: BLE001
            stats = {}

        return build_system_prompt(actor.name, projects, stats)
