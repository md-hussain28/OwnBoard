import json
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any, TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

from onboard.config.settings import get_settings

TModel = TypeVar("TModel", bound=BaseModel)


class LLMClient:
    """Thin wrapper around the OpenAI SDK for embeddings and chat completions."""

    def __init__(self, api_key: str, embedding_model: str, chat_model: str, chat_model_complex: str | None = None):
        self._client = AsyncOpenAI(api_key=api_key)
        self.embedding_model = embedding_model
        self.chat_model = chat_model
        # Stronger model for complex requests; falls back to the default when unset.
        self.chat_model_complex = chat_model_complex or chat_model

    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(model=self.embedding_model, input=text)
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch-embed texts in a single OpenAI request (order-preserving)."""
        if not texts:
            return []
        response = await self._client.embeddings.create(model=self.embedding_model, input=texts)
        # API returns data possibly unsorted; sort by index to preserve input order.
        ordered = sorted(response.data, key=lambda item: item.index)
        return [item.embedding for item in ordered]

    async def chat(self, messages: list[dict[str, str]]) -> str:
        response = await self._client.chat.completions.create(model=self.chat_model, messages=messages)
        return response.choices[0].message.content or ""

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> AsyncIterator[str]:
        """Stream a chat completion token-by-token, yielding each non-None content delta."""
        stream = await self._client.chat.completions.create(
            model=model or self.chat_model,
            messages=messages,
            temperature=temperature,
            stream=True,
        )
        async for chunk in stream:
            # Some chunks (e.g. the final usage-only frame) carry an empty `choices` list.
            if not chunk.choices:
                continue
            yield chunk.choices[0].delta.content or ""

    async def stream_chat_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        *,
        model: str | None = None,
        temperature: float = 0.3,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream a tool-enabled chat completion for the generative-UI "Ask project" assistant.

        Yields ``{"type": "text", "text": <delta>}`` for content as it arrives, then a single
        ``{"type": "tool_calls", "tool_calls": [{"id", "name", "arguments"}], "finish_reason": ...}``
        at the end (``arguments`` parsed to a dict). The caller drives the tool loop — these display
        tools have no server-side effect, so it just acknowledges them and continues for a wrap-up.
        """
        stream = await self._client.chat.completions.create(
            model=model or self.chat_model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            temperature=temperature,
            stream=True,
        )
        acc: dict[int, dict[str, Any]] = {}
        finish_reason: str | None = None
        async for chunk in stream:
            if not chunk.choices:
                continue
            choice = chunk.choices[0]
            delta = choice.delta
            if delta is not None and delta.content:
                yield {"type": "text", "text": delta.content}
            if delta is not None and delta.tool_calls:
                for tc in delta.tool_calls:
                    slot = acc.setdefault(tc.index, {"id": None, "name": None, "arguments": ""})
                    if tc.id:
                        slot["id"] = tc.id
                    if tc.function is not None:
                        if tc.function.name:
                            slot["name"] = tc.function.name
                        if tc.function.arguments:
                            slot["arguments"] += tc.function.arguments
            if choice.finish_reason:
                finish_reason = choice.finish_reason

        tool_calls: list[dict[str, Any]] = []
        for index in sorted(acc):
            slot = acc[index]
            try:
                arguments = json.loads(slot["arguments"] or "{}")
            except json.JSONDecodeError:
                arguments = {}
            tool_calls.append({"id": slot["id"], "name": slot["name"], "arguments": arguments})
        yield {"type": "tool_calls", "tool_calls": tool_calls, "finish_reason": finish_reason}

    async def parse(self, messages: list[dict[str, str]], response_model: type[TModel]) -> TModel | None:
        """Structured output via the SDK's native JSON-schema parsing.

        Uses OpenAI structured outputs so the model is *constrained* to emit an object matching
        `response_model` — no regex-scraping free text, no malformed-JSON retries. Returns the parsed
        model, or None when the model refused / returned nothing usable.
        """
        completion = await self._client.chat.completions.parse(
            model=self.chat_model, messages=messages, response_format=response_model
        )
        return completion.choices[0].message.parsed


@lru_cache
def get_llm_client() -> LLMClient:
    settings = get_settings()
    return LLMClient(
        api_key=settings.OPENAI_API_KEY,
        embedding_model=settings.OPENAI_EMBEDDING_MODEL,
        chat_model=settings.OPENAI_CHAT_MODEL,
        chat_model_complex=settings.OPENAI_CHAT_MODEL_COMPLEX,
    )
