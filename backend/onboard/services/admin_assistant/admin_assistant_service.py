"""Agentic admin "AI Assistant" — org-wide onboarding analytics + real admin actions (PRD §6.3).

Unlike `ProjectChatService` (read-only, fire-and-forget "display tools"), this assistant runs a genuine
tool-execution loop: it calls REAL backend services to fetch stats and to perform admin mutations
(add a member to a project, create an employee, assign onboarding), feeds each tool's result back to the
model, and lets it narrate + render the outcome with the same generative-UI component catalog.

Two tool families:
- ACTION tools (defined here) — executed server-side; their JSON result is fed back to the model.
  Read actions (`listProjects`, `getOnboardingStats`, …) resolve names→ids and answer analytics.
  Write actions (`addProjectMember`, `createEmployee`, `assignOnboarding`, …) mutate data.
- DISPLAY tools — the generative-UI catalog reused verbatim from `project_chat_service._TOOLS`; the
  model calls these to render metrics/charts/tables/callouts; the tool `input` IS the render payload.

Every mutation is authorized through the underlying service's `viewer`/`actor` checks, and the endpoint
itself is admin-gated. `stream_answer` yields the same provider-agnostic events as ProjectChatService
(`text` / `component` / `error`) so it reuses `vercel_stream.to_ui_message_stream` untouched.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import OnboardError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.doc_pack_dao import DocPackDAO
from onboard.dao.employee_dao import EmployeeDAO
from onboard.dao.models.doc_pack import PackAssignmentStatus
from onboard.dao.models.employee import Employee
from onboard.dao.pack_assignment_dao import PackAssignmentDAO
from onboard.services.employee.employee_service import EmployeeService
from onboard.services.pack_assignment.pack_assignment_service import PackAssignmentService
from onboard.services.project.project_service import ProjectService
from onboard.services.project_chat.project_chat_service import _TOOLS as _DISPLAY_TOOLS

_MAX_TOOL_ROUNDS = 5
_MAX_HISTORY_TURNS = 8
_RESULT_CHAR_LIMIT = 6000


def _enum(*values: str) -> dict[str, Any]:
    return {"type": "string", "enum": list(values)}


# Real, executed tools. Read tools answer analytics + resolve names→ids; write tools mutate data.
_ACTION_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "listProjects",
            "description": "List all projects in the org with member/track counts and lead. Use to resolve a project name to its id.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listEmployees",
            "description": "List all people in the org (id, name, role, app_role, github handle). Use to resolve a person's name to their employee id before acting.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listTracks",
            "description": "List onboarding tracks (doc packs) with ids — general (company-wide) and project-scoped. Use to resolve a track name to its id before assigning.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getOnboardingStats",
            "description": "Org-wide onboarding cohort stats: total/passed/failed/overdue/not-started assignment counts, completion %, avg days to onboard, per-track breakdown. THE tool for 'how many passed / failed'.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProjectOnboardingStats",
            "description": "Onboarding pass/fail/in-progress counts scoped to ONE project.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "getProjectMembers",
            "description": "List the members of one project with their readiness and whether they're a go-to person.",
            "parameters": {
                "type": "object",
                "properties": {"projectId": {"type": "string"}},
                "required": ["projectId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listRecentOutcomes",
            "description": "The most recent onboarding pass/fail outcomes across the org (newest first).",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Default 20, max 50."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "addProjectMember",
            "description": "Add an existing (non-admin) employee to a project as a member. Resolve both ids first with listProjects/listEmployees.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                    "employeeId": {"type": "string"},
                },
                "required": ["projectId", "employeeId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "removeProjectMember",
            "description": "Remove a member from a project. Only call this when the admin has clearly asked to remove that specific person.",
            "parameters": {
                "type": "object",
                "properties": {
                    "projectId": {"type": "string"},
                    "employeeId": {"type": "string"},
                },
                "required": ["projectId", "employeeId"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "createEmployee",
            "description": "Create a new person (member) in the org. Matching published onboarding tracks are auto-assigned. app_role defaults to 'member'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string", "description": "Job title, optional."},
                    "githubHandle": {"type": "string", "description": "Optional."},
                    "appRole": _enum("member", "admin"),
                },
                "required": ["name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "assignOnboarding",
            "description": "Assign an onboarding track (doc pack) to one or more employees. Resolve the pack id with listTracks and employee ids with listEmployees first.",
            "parameters": {
                "type": "object",
                "properties": {
                    "packId": {"type": "string"},
                    "employeeIds": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["packId", "employeeIds"],
            },
        },
    },
]

_ACTION_TOOL_NAMES = {t["function"]["name"] for t in _ACTION_TOOLS}
_TOOLS = _ACTION_TOOLS + _DISPLAY_TOOLS


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
        messages: list[dict[str, Any]] = [{"role": "system", "content": await self._build_system_prompt(org_id, actor)}]
        for turn in (history or [])[-_MAX_HISTORY_TURNS:]:
            role, content = turn.get("role"), (turn.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})

        model = self.llm.chat_model_complex

        try:
            for _round in range(_MAX_TOOL_ROUNDS):
                tool_calls: list[dict[str, Any]] = []
                async for event in self.llm.stream_chat_tools(messages, _TOOLS, model=model):
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
                    if name in _ACTION_TOOL_NAMES:
                        result = await self._execute_action(org_id, actor, name, args)
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

        project_lines = (
            "\n".join(
                f"- {p.name} (id: {p.id}) — {getattr(p, 'member_count', 0)} members, "
                f"{getattr(p, 'track_count', 0)} tracks"
                for p in projects[:40]
            )
            or "- (no projects yet)"
        )

        stats_line = (
            f"{stats.get('passed', 0)} passed, {stats.get('failed', 0)} failed, "
            f"{stats.get('not_started', 0)} not started, {stats.get('overdue', 0)} overdue "
            f"of {stats.get('total_assignments', 0)} onboarding assignments "
            f"({stats.get('completion_pct', 0)}% complete) across {stats.get('people_count', 0)} people."
            if stats
            else "(onboarding stats unavailable)"
        )

        return f"""You are the OwnBoard **AI Assistant** for administrators. You help {actor.name or "the admin"} run onboarding for their organization: answer questions about progress and people, and TAKE ACTIONS on their behalf (add members to projects, create people, assign onboarding).

## What you can do
You have two kinds of tools:
1. Data + action tools that really run against the system — use them to fetch live facts and to make changes. To act on a person or project you usually must resolve names to ids first (call listEmployees / listProjects / listTracks), then call the action with those ids.
2. Display tools (showMetrics, showChart, showTable, showPeople, showCallout, showComparison, showProgress, showTimeline, showActions, showKeyValue, etc.) that render rich interactive components. The tool arguments ARE the rendered content.

## How to answer well
- For analytics questions ("how many passed / failed", "who isn't done", per-project progress): call the matching data tool, then VISUALIZE the result — e.g. showMetrics for the headline numbers and showChart or showTable for the breakdown. Don't just describe numbers in prose when a component shows them better.
- For action requests ("add Priya to the Payments project", "create a new hire", "assign the Security track to X"): resolve ids, perform the action, then confirm what happened with a showCallout (intent 'success', or 'danger' if it failed) stating exactly what changed. Never claim an action succeeded unless its tool result said ok:true.
- Only perform a mutation the admin actually asked for. For anything destructive (removing a member) do it only on an explicit, unambiguous request; if unsure, ask a brief clarifying question instead of guessing.
- Ground every factual number in a tool result — never invent counts, names, ids, or outcomes. If a tool returns an error, explain it plainly.
- Be concise and warm. End substantive answers with showActions chips suggesting useful next steps (e.g. "Show overdue people", "Assign a track").

## Organization snapshot (live, for grounding — still call tools for specifics)
Onboarding: {stats_line}
Projects:
{project_lines}

Do not mention "tools", "functions", or "components" to the user — just do the work and show the results."""
