"""Display-tool catalog for "Ask Project" generative UI (PRD §6.3).

Each entry is an OpenAI function-tool schema the model calls to render an interactive component.
Property names are camelCase to match the frontend zod schemas (`frontend/src/schemas/ask.schema.ts`)
that validate + render these payloads verbatim.
"""

from typing import Any


def _enum(*values: str) -> dict[str, Any]:
    return {"type": "string", "enum": list(values)}


# Display tools = the generative UI catalog. Property names are camelCase to match the frontend zod
# schemas (`frontend/src/schemas/ask.schema.ts`) that validate + render these payloads verbatim.
TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "showMetrics",
            "description": "Render 1-6 KPI tiles for numeric summaries (counts, coverage %, bus factor, readiness).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "metrics": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "string"},
                                "hint": {"type": "string"},
                                "intent": _enum("neutral", "positive", "warning", "danger"),
                                "delta": {"type": "string"},
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["metrics"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showChart",
            "description": "Render a bar/line/area/pie/donut/radar chart for comparable numbers in the answer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": _enum("bar", "line", "area", "pie", "donut", "radar"),
                    "title": {"type": "string"},
                    "subtitle": {"type": "string"},
                    "unit": {"type": "string"},
                    "data": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "number"},
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["type", "title", "data"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showCitations",
            "description": "Show the sources used. ALWAYS call this when you used any document or code file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "citations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "documentId": {
                                    "type": "string",
                                    "description": "EXACT document_id from context (doc sources) so it can open.",
                                },
                                "title": {"type": "string"},
                                "source": _enum("doc", "code", "commit"),
                                "snippet": {"type": "string"},
                                "filePath": {"type": "string"},
                            },
                            "required": ["title", "source"],
                        },
                    },
                },
                "required": ["citations"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showChecklist",
            "description": "Render an ordered, actionable checklist (ramp-up steps, setup, what to read first).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "intro": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "detail": {"type": "string"},
                                "done": {"type": "boolean"},
                            },
                            "required": ["title"],
                        },
                    },
                },
                "required": ["title", "items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showTimeline",
            "description": "Render a chronological timeline of milestones, releases, or an onboarding plan.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "timeframe": {"type": "string"},
                                "detail": {"type": "string"},
                            },
                            "required": ["title"],
                        },
                    },
                },
                "required": ["title", "items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showComparison",
            "description": "Render a small comparison table across 2-4 columns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "columns": {"type": "array", "items": {"type": "string"}},
                    "rows": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "cells": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["label", "cells"],
                        },
                    },
                },
                "required": ["title", "columns", "rows"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showExpert",
            "description": "Recommend who to ask, with reasoning, evidence, an optional draft message, and bus-factor risk.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "role": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "array", "items": {"type": "string"}},
                    "draftMessage": {"type": "string"},
                    "busFactorRisk": _enum("low", "medium", "high"),
                },
                "required": ["name", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showCallout",
            "description": "Render a highlighted note; use intent 'escalate' for low-confidence answers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "intent": _enum("info", "success", "warning", "danger", "escalate"),
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                },
                "required": ["intent", "title", "body"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showCodeSnippet",
            "description": "Show a focused code excerpt (≤40 lines) from the retrieved code, with its file path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "filePath": {"type": "string", "description": "Repo-relative path the code is from."},
                    "language": {"type": "string", "description": "Language hint, e.g. 'ts', 'python', 'bash'."},
                    "code": {"type": "string", "description": "The code, verbatim from context."},
                    "caption": {"type": "string", "description": "One-line explanation."},
                },
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showFileTree",
            "description": "Map where the relevant code lives as a file tree, using REAL paths from the context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "root": {"type": "string", "description": "Optional root label (repo/module name)."},
                    "paths": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "path": {
                                    "type": "string",
                                    "description": "'/'-separated path; end folders with '/'.",
                                },
                                "note": {"type": "string"},
                            },
                            "required": ["path"],
                        },
                    },
                },
                "required": ["paths"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showCommands",
            "description": "Show copyable terminal commands (setup/run). Only commands grounded in the docs/config.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "intro": {"type": "string"},
                    "commands": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "command": {"type": "string"},
                                "description": {"type": "string"},
                            },
                            "required": ["command"],
                        },
                    },
                },
                "required": ["commands"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showPeople",
            "description": "A roster of 2-8 contributors (name, role, focus, activity). Use showExpert to route to ONE.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "people": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "role": {"type": "string"},
                                "focus": {"type": "string"},
                                "stat": {"type": "string", "description": "e.g. '42 commits'."},
                            },
                            "required": ["name"],
                        },
                    },
                },
                "required": ["people"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showFaq",
            "description": "An expandable Q&A accordion of common questions a new hire would ask about the project.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "answer": {"type": "string"},
                            },
                            "required": ["question", "answer"],
                        },
                    },
                },
                "required": ["items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showKeyValue",
            "description": "A fact/spec sheet of non-numeric project details (stack, entrypoints, URLs, package manager).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "string"},
                                "href": {"type": "string"},
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showQuiz",
            "description": "An interactive knowledge-check MCQ to reinforce onboarding. The user picks and gets feedback.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                    "correctIndex": {"type": "integer", "description": "0-based index of the correct option."},
                    "explanation": {"type": "string", "description": "Why the correct answer is right."},
                },
                "required": ["question", "options", "correctIndex"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showTabs",
            "description": "Split an answer into 2-5 switchable tabs (e.g. by area/layer/option).",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "tabs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "body": {"type": "string"},
                            },
                            "required": ["label", "body"],
                        },
                    },
                },
                "required": ["tabs"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showFlashcards",
            "description": "A flip-card deck of term→definition pairs for concepts a new hire should learn.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "cards": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "front": {"type": "string"},
                                "back": {"type": "string"},
                            },
                            "required": ["front", "back"],
                        },
                    },
                },
                "required": ["cards"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showResources",
            "description": "A grid of resource cards. Prefer real project docs with the EXACT documentId so they open.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "resources": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "description": {"type": "string"},
                                "documentId": {
                                    "type": "string",
                                    "description": "EXACT document_id from context (opens the doc).",
                                },
                                "href": {"type": "string", "description": "External URL if not a project doc."},
                                "kind": _enum("doc", "code", "link"),
                            },
                            "required": ["label"],
                        },
                    },
                },
                "required": ["resources"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showSteps",
            "description": "An interactive numbered walkthrough of a procedure / how-something-works, each step expandable with optional code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "intro": {"type": "string"},
                    "steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "detail": {"type": "string"},
                                "code": {"type": "string", "description": "Optional ≤20-line excerpt, verbatim."},
                                "language": {"type": "string"},
                            },
                            "required": ["title"],
                        },
                    },
                },
                "required": ["steps"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showTable",
            "description": "A generic, click-to-sort data table. Use showComparison for a simple side-by-side of a few options.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "caption": {"type": "string"},
                    "columns": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "header": {"type": "string"},
                                "align": _enum("left", "center", "right"),
                                "numeric": {
                                    "type": "boolean",
                                    "description": "True for number columns (sorts numerically).",
                                },
                            },
                            "required": ["header"],
                        },
                    },
                    "rows": {
                        "type": "array",
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Cell strings in column order (same length as columns).",
                        },
                    },
                },
                "required": ["columns", "rows"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showProgress",
            "description": "Labeled progress bars for completion/coverage percentages. Use showMetrics for single KPI numbers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "number", "description": "Percent 0-100."},
                                "caption": {"type": "string", "description": "Optional right-side text, e.g. '18/24'."},
                                "intent": _enum("neutral", "positive", "warning", "danger"),
                            },
                            "required": ["label", "value"],
                        },
                    },
                },
                "required": ["items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showRating",
            "description": "Discrete pip ratings (score out of a small max) for skill/maturity/confidence levels. Use showProgress for percentages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "score": {"type": "number", "description": "Filled pips, 0..max."},
                                "max": {"type": "integer", "description": "Total pips (default 5)."},
                                "caption": {"type": "string"},
                            },
                            "required": ["label", "score"],
                        },
                    },
                },
                "required": ["items"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showGlossary",
            "description": "A searchable term→definition reference for domain jargon. Use showFlashcards for study/flip cards.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "terms": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "term": {"type": "string"},
                                "definition": {"type": "string"},
                                "aka": {"type": "string", "description": "Optional alias / acronym expansion."},
                            },
                            "required": ["term", "definition"],
                        },
                    },
                },
                "required": ["terms"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showBadges",
            "description": "A compact cluster of pills for a tech stack, labels, topics, or tags.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "badges": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "tone": _enum("neutral", "accent", "info", "success", "warning", "danger"),
                            },
                            "required": ["label"],
                        },
                    },
                },
                "required": ["badges"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showAccordion",
            "description": "Collapsible content sections for a long segmented explanation. Use showFaq for Q&A, showTabs for parallel options.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "sections": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "heading": {"type": "string"},
                                "body": {"type": "string"},
                                "defaultOpen": {"type": "boolean"},
                            },
                            "required": ["heading", "body"],
                        },
                    },
                },
                "required": ["sections"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showQuote",
            "description": "An attributed pull-quote, verbatim from a doc/commit/PR/person. Pass documentId to make it open the source.",
            "parameters": {
                "type": "object",
                "properties": {
                    "quote": {"type": "string"},
                    "author": {"type": "string"},
                    "role": {"type": "string", "description": "Role or source, e.g. 'PRD §6.3', 'commit message'."},
                    "documentId": {
                        "type": "string",
                        "description": "EXACT document_id from context (opens the source).",
                    },
                },
                "required": ["quote"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showActions",
            "description": "Interactive follow-up question chips; clicking one asks it. Great to end an answer with next things to explore.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "actions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string", "description": "Short button text."},
                                "prompt": {
                                    "type": "string",
                                    "description": "The full follow-up question asked on click.",
                                },
                            },
                            "required": ["label", "prompt"],
                        },
                    },
                },
                "required": ["actions"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showKeyTakeaways",
            "description": "A short highlighted TL;DR list of the 1-6 most important points from your answer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "points": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["points"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showTree",
            "description": "An interactive expand/collapse hierarchy (concept/dependency/decision/org). Flat node list; parentId builds the tree. Use showFileTree for real repo paths.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "parentId": {"type": "string", "description": "Parent's id; omit for root(s)."},
                                "label": {"type": "string"},
                                "detail": {"type": "string"},
                                "badge": {"type": "string"},
                            },
                            "required": ["id", "label"],
                        },
                    },
                },
                "required": ["nodes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showFlow",
            "description": "An interactive node-and-edge graph for a process/flow/architecture/decision. Nodes auto-layer by dependency; clicking a node traces its connections. Use showSteps for a purely linear procedure.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "label": {"type": "string"},
                                "detail": {"type": "string", "description": "Shown when the node is focused."},
                                "kind": _enum("start", "step", "decision", "io", "end"),
                            },
                            "required": ["id", "label"],
                        },
                    },
                    "edges": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "from": {"type": "string"},
                                "to": {"type": "string"},
                                "label": {"type": "string", "description": "Optional, e.g. 'yes'/'no'."},
                            },
                            "required": ["from", "to"],
                        },
                    },
                },
                "required": ["nodes", "edges"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showApiEndpoint",
            "description": "Document ONE HTTP API endpoint: method + path + params + request/response examples. Ground it in real routes/code from the context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "method": _enum("GET", "POST", "PUT", "PATCH", "DELETE"),
                    "path": {"type": "string", "description": "Route path, e.g. '/api/v1/projects/{id}/members'."},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "auth": {"type": "string", "description": "Auth requirement, e.g. 'Admin only'."},
                    "params": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "type": {"type": "string"},
                                "required": {"type": "boolean"},
                                "description": {"type": "string"},
                            },
                            "required": ["name"],
                        },
                    },
                    "requestExample": {"type": "string", "description": "Example body/curl, verbatim from context."},
                    "responseExample": {
                        "type": "string",
                        "description": "Example response JSON, verbatim from context.",
                    },
                },
                "required": ["method", "path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showAnnotatedCode",
            "description": "A guided code walkthrough: a code excerpt (≤50 lines, verbatim) with line-anchored annotations the reader clicks to highlight. Use showCodeSnippet for code that needs no per-line notes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "filePath": {"type": "string"},
                    "language": {"type": "string"},
                    "code": {"type": "string", "description": "The code, verbatim. Line numbers are 1-based."},
                    "annotations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "line": {"type": "integer", "description": "1-based start line."},
                                "endLine": {"type": "integer", "description": "1-based end line for a range."},
                                "label": {"type": "string"},
                                "note": {"type": "string"},
                            },
                            "required": ["line", "note"],
                        },
                    },
                },
                "required": ["code", "annotations"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showDiff",
            "description": "A before→after code diff (added/removed/context lines). Great for 'what changed recently' or explaining a migration. Ground it in real commits/code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "filePath": {"type": "string"},
                    "language": {"type": "string"},
                    "summary": {"type": "string", "description": "One-line summary of the change."},
                    "lines": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "kind": _enum("add", "remove", "context"),
                                "text": {"type": "string", "description": "Line content WITHOUT a +/-/space marker."},
                            },
                            "required": ["kind", "text"],
                        },
                    },
                },
                "required": ["lines"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showEnvVars",
            "description": "Environment/config variables for setup: name, required, secret (masked with reveal), example. Ground in the project's env/config docs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "intro": {"type": "string"},
                    "vars": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "required": {"type": "boolean"},
                                "secret": {
                                    "type": "boolean",
                                    "description": "True for keys/secrets (masks the example).",
                                },
                                "example": {"type": "string"},
                            },
                            "required": ["name"],
                        },
                    },
                },
                "required": ["vars"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showDecisionTree",
            "description": "An interactive 'choose your path' guide: the user answers questions step by step and lands on a recommendation. Flat node list; options point to the next node id; terminal nodes carry a result. Use showFlow for a non-interactive process graph.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "rootId": {"type": "string", "description": "Id of the starting node."},
                    "nodes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "question": {
                                    "type": "string",
                                    "description": "Question at this node (omit on terminal nodes).",
                                },
                                "result": {"type": "string", "description": "Recommendation shown at a terminal node."},
                                "detail": {"type": "string"},
                                "options": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "label": {"type": "string"},
                                            "next": {
                                                "type": "string",
                                                "description": "Id of the node this choice leads to.",
                                            },
                                        },
                                        "required": ["label", "next"],
                                    },
                                },
                            },
                            "required": ["id"],
                        },
                    },
                },
                "required": ["rootId", "nodes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showConfidenceCheck",
            "description": "An interactive self-assessment: the user rates their confidence (1-5) on 2-8 areas; the component tallies readiness and points to their weakest area. A reflective onboarding check-in.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "intro": {"type": "string"},
                    "topics": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "hint": {"type": "string"},
                            },
                            "required": ["label"],
                        },
                    },
                },
                "required": ["topics"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "showProsCons",
            "description": "Weigh 1-3 options as pros vs cons with an optional verdict. Use showComparison for a feature matrix across many columns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "pros": {"type": "array", "items": {"type": "string"}},
                                "cons": {"type": "array", "items": {"type": "string"}},
                                "verdict": {"type": "string"},
                            },
                            "required": ["label", "pros", "cons"],
                        },
                    },
                },
                "required": ["options"],
            },
        },
    },
]
