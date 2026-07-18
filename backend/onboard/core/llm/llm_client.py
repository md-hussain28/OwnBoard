from collections.abc import AsyncIterator
from functools import lru_cache
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel

from onboard.config.settings import get_settings

TModel = TypeVar("TModel", bound=BaseModel)


class LLMClient:
    """Thin wrapper around the OpenAI SDK for embeddings and chat completions."""

    def __init__(self, api_key: str, embedding_model: str, chat_model: str):
        self._client = AsyncOpenAI(api_key=api_key)
        self.embedding_model = embedding_model
        self.chat_model = chat_model

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
            yield chunk.choices[0].delta.content or ""

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
    )
