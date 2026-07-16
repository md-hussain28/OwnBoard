from functools import lru_cache

from openai import AsyncOpenAI

from onboard.config.settings import get_settings


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


@lru_cache
def get_llm_client() -> LLMClient:
    settings = get_settings()
    return LLMClient(
        api_key=settings.OPENAI_API_KEY,
        embedding_model=settings.OPENAI_EMBEDDING_MODEL,
        chat_model=settings.OPENAI_CHAT_MODEL,
    )
