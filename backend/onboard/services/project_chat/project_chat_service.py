"""Generative-UI "Ask Project" Q&A grounded in a project's docs + repo code, streamed over SSE (PRD §6.3).

Retrieval (OpenAI embeddings + pgvector) and generation (OpenAI tool-calling) both run here, on the
backend — the browser never holds a key. The model answers in Markdown AND calls "display tools" that
the frontend renders as charts, checklists, citations, expert cards, etc.

`stream_answer` yields provider-agnostic semantic events — `{"type":"text","text"}` deltas,
`{"type":"component","id","name","input"}` per rendered tool, and `{"type":"error","message"}`. The
router (`vercel_stream.py`) translates these into the Vercel AI SDK "UI message stream" SSE protocol
so the frontend's `useChat` + AI Elements consume them natively.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from onboard.core.common.exceptions import NotFoundError
from onboard.core.llm.llm_client import LLMClient, get_llm_client
from onboard.dao.commit_record_dao import CommitRecordDAO
from onboard.dao.doc_chunk_dao import DocChunkDAO
from onboard.dao.doc_pack_dao import DocPackDocumentDAO
from onboard.dao.project_dao import ProjectDAO, ProjectRepoDAO
from onboard.services.rag.rag_service import RAGService

_DOC_TOP_K = 6
_CODE_TOP_K = 6  # spread across all linked repos
_CODE_PER_REPO_K = 3
_COMMITS_PER_REPO = 6
_COMMITS_TOTAL = 12
_CHUNK_CHAR_LIMIT = 1400
_MAX_TOOL_ROUNDS = 2
_MAX_HISTORY_TURNS = 6

# Cheap, zero-latency signals that a question warrants the stronger (complex) model rather than
# the fast default. Deliberately a heuristic — no extra LLM classification call, since this runs
# on a tiny host and we don't want to pay a round-trip just to pick a model.
_COMPLEX_SIGNALS = (
    "architecture",
    "compare",
    "comparison",
    "trade-off",
    "tradeoff",
    "how does",
    "how do",
    "walk me through",
    "end-to-end",
    "end to end",
    "deep dive",
    "in detail",
    "difference between",
    "pros and cons",
    "lifecycle",
    "under the hood",
    "debug",
    "refactor",
    "best way",
    "step by step",
    "explain",
    "why",
)


def _enum(*values: str) -> dict[str, Any]:
    return {"type": "string", "enum": list(values)}


# Display tools = the generative UI catalog. Property names are camelCase to match the frontend zod
# schemas (`frontend/src/schemas/ask.schema.ts`) that validate + render these payloads verbatim.
_TOOLS: list[dict[str, Any]] = [
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
]


class ProjectChatService:
    """Retrieval-augmented, streaming, generative-UI Q&A over a project's docs and repo code."""

    def __init__(self, session: AsyncSession, llm: LLMClient | None = None):
        self.session = session
        self.llm = llm or get_llm_client()
        self.project_dao = ProjectDAO(session)
        self.project_repo_dao = ProjectRepoDAO(session)
        self.doc_chunk_dao = DocChunkDAO(session)
        self.document_dao = DocPackDocumentDAO(session)
        self.commit_dao = CommitRecordDAO(session)
        self.rag = RAGService(session, llm=self.llm)

    async def stream_answer(
        self,
        org_id: str,
        project_id: str,
        question: str,
        *,
        history: list[dict[str, str]] | None = None,
    ) -> AsyncIterator[dict]:
        """Retrieve context, then stream a grounded answer + generative components over the SSE contract."""
        context = await self.retrieve_context(org_id, project_id, question)

        messages: list[dict[str, Any]] = [{"role": "system", "content": _build_system_prompt(context)}]
        for turn in (history or [])[-_MAX_HISTORY_TURNS:]:
            role, content = turn.get("role"), (turn.get("content") or "").strip()
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": question})

        model = self._select_model(question, history)

        try:
            for _round in range(_MAX_TOOL_ROUNDS):
                tool_calls: list[dict[str, Any]] = []
                async for event in self.llm.stream_chat_tools(messages, _TOOLS, model=model):
                    if event["type"] == "text":
                        if event["text"]:
                            yield {"type": "text", "text": event["text"]}
                    elif event["type"] == "tool_calls":
                        tool_calls = event["tool_calls"]

                for call in tool_calls:
                    if call.get("name"):
                        yield {
                            "type": "component",
                            "id": call.get("id"),
                            "name": call["name"],
                            "input": call["arguments"],
                        }

                if not tool_calls:
                    break

                # Acknowledge the display tools so the model can add a short wrap-up next round.
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
                    if call.get("id"):
                        messages.append({"role": "tool", "tool_call_id": call["id"], "content": "rendered"})
        except Exception as exc:  # keep the stream resilient — surface, don't crash
            yield {"type": "error", "message": str(exc)}

    def _select_model(self, question: str, history: list[dict[str, str]] | None) -> str:
        """Pick the fast default vs. the stronger complex model from cheap heuristics on the question.

        Complex if the question is long/multi-part, uses reasoning-heavy phrasing, or the conversation
        already has depth — otherwise the fast model keeps latency and cost low on this small host.
        """
        q = (question or "").lower().strip()
        is_complex = (
            len(q) >= 240
            or len(q.split()) >= 40
            or q.count("?") >= 2
            or any(signal in q for signal in _COMPLEX_SIGNALS)
            or sum(1 for turn in (history or []) if turn.get("role") == "user") >= 4
        )
        return self.llm.chat_model_complex if is_complex else self.llm.chat_model

    async def retrieve_context(self, org_id: str, project_id: str, question: str) -> dict:
        """Retrieve ranked grounding context as structured JSON (also exposed at `/ask/context`)."""
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")

        query_embedding = await self.llm.embed(question)

        doc_hits = await self.doc_chunk_dao.similarity_search_for_project(
            org_id, project_id, query_embedding, top_k=_DOC_TOP_K
        )
        doc_chunks: list[dict] = []
        title_cache: dict[str, str] = {}
        for chunk, distance in doc_hits:
            label = title_cache.get(chunk.document_id)
            if label is None:
                document = await self.document_dao.get_by_id_for_org(org_id, chunk.document_id)
                label = document.title if document is not None else chunk.document_id
                title_cache[chunk.document_id] = label
            doc_chunks.append(
                {
                    "document_id": chunk.document_id,
                    "document_title": label,
                    "content": chunk.content,
                    "score": max(0.0, 1.0 - distance),
                    "page_start": chunk.page_start,
                    "page_end": chunk.page_end,
                }
            )

        project_repos = await self.project_repo_dao.list_for_project(project_id)
        code_hits: list[dict] = []
        for pr in project_repos:
            for hit in await self.rag.retrieve_code(org_id, pr.repo_id, question, top_k=_CODE_PER_REPO_K):
                code_hits.append(hit)
        code_hits.sort(key=lambda h: h.get("score", 0.0), reverse=True)
        code_chunks = [
            {"file_path": h["file_path"], "content": h["content"], "score": h.get("score", 0.0)}
            for h in code_hits[:_CODE_TOP_K]
        ]

        commits = await self._recent_commits_across_repos(project_repos)

        return {
            "project": {
                "name": project.name,
                "description": project.description,
                "tech_stack": self._coerce_tech_stack(project.tech_stack),
            },
            "doc_chunks": doc_chunks,
            "code_chunks": code_chunks,
            "commits": commits,
        }

    async def get_document_content(self, org_id: str, project_id: str, document_id: str) -> dict:
        """Ordered extracted text for one project document — backs the citation → viewer sheet."""
        project = await self.project_dao.get_by_id_for_org(org_id, project_id)
        if project is None:
            raise NotFoundError(f"Project {project_id} not found")
        document = await self.document_dao.get_by_id_for_org(org_id, document_id)
        if document is None:
            raise NotFoundError(f"Document {document_id} not found")

        chunks = await self.doc_chunk_dao.list_for_document(org_id, document_id)
        return {
            "document_id": document.id,
            "title": document.title,
            "file_type": document.file_type,
            "chunks": [
                {
                    "chunk_index": c.chunk_index,
                    "content": c.content,
                    "page_start": c.page_start,
                    "page_end": c.page_end,
                    "section_title": c.section_title,
                }
                for c in chunks
            ],
        }

    async def _recent_commits_across_repos(self, project_repos) -> list[str]:
        """Recent commit subjects across the project's repos — grounds 'what changed / who did what'."""
        lines: list[str] = []
        for pr in project_repos:
            for commit in await self.commit_dao.list_recent_for_repo(pr.repo_id, limit=_COMMITS_PER_REPO):
                subject = (commit.message or "").strip().splitlines()[0] if commit.message else ""
                if subject:
                    lines.append(subject)
        return lines[:_COMMITS_TOTAL]

    @staticmethod
    def _coerce_tech_stack(raw) -> list[str]:
        """`tech_stack` is free-form JSONB (strings or `{name}` dicts) — flatten to display labels."""
        if not isinstance(raw, list):
            return []
        labels: list[str] = []
        for item in raw:
            if isinstance(item, str) and item.strip():
                labels.append(item.strip())
            elif isinstance(item, dict):
                name = item.get("name") or item.get("label")
                if name:
                    labels.append(str(name))
        return labels


def _clamp(text: str, limit: int = _CHUNK_CHAR_LIMIT) -> str:
    trimmed = (text or "").strip()
    return trimmed if len(trimmed) <= limit else f"{trimmed[:limit]}…"


def _render_context(context: dict) -> str:
    project = context["project"]
    blocks: list[str] = []
    stack = f" · Tech: {', '.join(project['tech_stack'])}" if project.get("tech_stack") else ""
    desc = f" — {project['description']}" if project.get("description") else ""
    blocks.append(f"PROJECT: {project['name']}{desc}{stack}")

    if context["doc_chunks"]:
        docs = "\n\n".join(
            f"[document_id: {c['document_id']} | title: {c['document_title']}]\n{_clamp(c['content'])}"
            for c in context["doc_chunks"]
        )
        blocks.append("DOCUMENTS (cite these with showCitations using the exact document_id):\n" + docs)

    if context["code_chunks"]:
        code = "\n\n".join(f"[file: {c['file_path']}]\n{_clamp(c['content'])}" for c in context["code_chunks"])
        blocks.append("CODE:\n" + code)

    if context["commits"]:
        blocks.append("RECENT COMMITS:\n" + "\n".join(f"- {line}" for line in context["commits"]))

    return "\n\n".join(blocks)


def _build_system_prompt(context: dict) -> str:
    has_context = bool(context["doc_chunks"] or context["code_chunks"] or context["commits"])
    empty_rule = (
        ""
        if has_context
        else "- The retrieved context is empty. Tell the user no indexed docs/code matched, and call showCallout with intent 'escalate'.\n"
    )
    rendered = _render_context(context) if has_context else "(no matching project context was retrieved)"

    return f"""You are the onboarding assistant for the software project "{context["project"]["name"]}". You help new hires, mentors, and engineering managers understand this project by answering questions grounded ONLY in the retrieved context below, and by calling tools that render rich interactive components alongside your prose.

## Grounding rules
- Answer using ONLY the retrieved context (project documents, repository code, recent commits). Never invent facts, file paths, people, or numbers.
- Every factual claim drawn from a document or code file MUST be backed by a showCitations call referencing the EXACT document_id + title from the context. This is how the user opens the source.
- If the context does not contain enough to answer confidently, do NOT guess. Say so briefly and call showCallout with intent "escalate" recommending a human.
{empty_rule}
## Interactive components (call these tools — do not describe them in prose)
Use tools to make answers scannable and useful. Prefer showing over telling. These are small building blocks — COMPOSE 2-4 of them into a richly structured answer that fits the question (e.g. a short prose intro → showFlow → showKeyTakeaways → showCitations → showActions). Do NOT dump every component; pick the ones that genuinely fit, order them so the answer reads top-to-bottom, and never render two components that say the same thing.
- showMetrics — KPI tiles for numeric summaries (doc counts, coverage, bus factor, readiness). Set intent to signal health.
- showChart — bar/line/area/pie/donut/radar for any comparable numbers (contributions per person, files per area, activity over time, doc-type breakdown, skill coverage).
- showCitations — the sources you used. ALWAYS include when you used any doc/code; doc citations must carry the real document_id.
- showChecklist — ordered actionable steps ("how do I start", "what to read first", ramp-up plans).
- showTimeline — chronological milestones, release order, or a week-by-week onboarding plan.
- showComparison — a small table comparing options/approaches/modules across 2-4 columns.
- showExpert — who to ask, with reasoning + evidence + an optional draft message; set busFactorRisk when one person is the sole owner.
- showCallout — a highlighted note; intent "escalate" for low confidence.
- showCodeSnippet — a focused code excerpt (≤40 lines) from the retrieved code, with its file path. Use when explaining how something works in code.
- showFileTree — map where the relevant code lives, using REAL paths from the context ("where is X", project structure).
- showCommands — copyable terminal commands for setup/running, grounded in the docs/config.
- showPeople — a roster of 2-8 contributors (name, role, focus, activity). Use showExpert instead when routing to ONE person.
- showFaq — an expandable Q&A of common new-hire questions about the project.
- showKeyValue — a fact sheet of non-numeric project details (stack, entrypoints, local URLs, package manager).
- showQuiz — an interactive knowledge-check MCQ to reinforce onboarding (set correctIndex + an explanation).
- showTabs — split an answer into 2-5 switchable tabs (by area/layer/option).
- showFlashcards — a flip-card deck of term→definition pairs for key concepts to learn.
- showResources — a grid of resource cards; prefer real project docs with the exact documentId so they open.
- showSteps — an expandable numbered walkthrough of a procedure / how something works, with optional per-step code.
- showTable — a generic click-to-sort data table (use showComparison for a simple side-by-side of a few options).
- showProgress — labeled progress bars for completion/coverage percentages (use showMetrics for single numbers).
- showRating — discrete pip ratings for skill/maturity/confidence levels out of a small max.
- showGlossary — a searchable term→definition reference for project jargon (use showFlashcards to study).
- showBadges — a compact pill cluster for a tech stack, labels, or topics.
- showAccordion — collapsible content sections for a long segmented explanation (use showFaq for Q&A, showTabs for parallel options).
- showQuote — an attributed pull-quote lifted verbatim from a source; pass documentId so it opens.
- showActions — 1-6 interactive follow-up question chips; end substantive answers with these so the user can go deeper.
- showKeyTakeaways — a short TL;DR highlight list of the 1-6 most important points.
- showTree — an interactive expand/collapse hierarchy (concept/dependency/decision/org). Use showFileTree for real repo paths.
- showFlow — an interactive node-and-edge graph for a process/flow/architecture/decision; clicking a node traces its connections.

## Style
- Be concise, warm, and concrete. Write in Markdown. Lead with the direct answer.
- Render at least one relevant component for substantive answers. For a pure greeting, a short text reply is fine.
- After calling a display tool, do NOT restate its contents in prose — add at most one short framing sentence.
- Do not mention "tools", "components", "context", or "retrieval" to the user.

## Retrieved context
{rendered}"""
