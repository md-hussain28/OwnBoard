"""Action-tool catalog for the admin AI Assistant (PRD §6.3).

Unlike the display tools (reused from `project_chat.tools`), these are REAL, executed tools: read
actions resolve names→ids and answer analytics; write actions mutate data. Their JSON result is fed
back to the model. Argument names are camelCase to match the model-facing convention.
"""

from typing import Any


def _enum(*values: str) -> dict[str, Any]:
    return {"type": "string", "enum": list(values)}


# Real, executed tools. Read tools answer analytics + resolve names→ids; write tools mutate data.
ACTION_TOOLS: list[dict[str, Any]] = [
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
            "description": "Create a NEW person in the org. Call this ONLY when the admin explicitly asked to create/add a new hire, or confirmed creating someone you couldn't find with listEmployees — never as a silent fallback for a name you failed to resolve. Matching published onboarding tracks are auto-assigned. app_role defaults to 'member'.",
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

ACTION_TOOL_NAMES = {t["function"]["name"] for t in ACTION_TOOLS}

# Write actions mutate data (vs. read actions that only resolve ids / fetch analytics). The UI marks
# these steps differently — a write that succeeded is a real change the admin should notice.
WRITE_ACTION_NAMES = {
    "addProjectMember",
    "removeProjectMember",
    "createEmployee",
    "assignOnboarding",
}

# Present-tense label shown live while each action runs, so the agent's steps read as real work.
ACTION_TITLES: dict[str, str] = {
    "listProjects": "Looking up projects",
    "listEmployees": "Looking up people",
    "listTracks": "Looking up onboarding tracks",
    "getOnboardingStats": "Reading onboarding stats",
    "getProjectOnboardingStats": "Reading project stats",
    "getProjectMembers": "Reading project members",
    "listRecentOutcomes": "Reading recent outcomes",
    "addProjectMember": "Adding member to project",
    "removeProjectMember": "Removing member from project",
    "createEmployee": "Creating person",
    "assignOnboarding": "Assigning onboarding track",
}
