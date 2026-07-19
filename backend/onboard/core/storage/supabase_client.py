from supabase import AsyncClient, acreate_client

from onboard.config.settings import get_settings


class SupabaseStorageClient:
    """Thin wrapper around Supabase Storage for doc pack file uploads.

    Holds the service-role key server-side only — this client must never be reachable
    from browser code. The service role bypasses bucket RLS, so all org-scoping happens
    in our own storage-path convention (`{org_id}/{doc_pack_id}/{document_id}-{filename}`)
    and DB rows, not in Supabase policies.
    """

    def __init__(self, client: AsyncClient, bucket: str):
        self._client = client
        self._bucket = bucket

    async def upload(self, path: str, content: bytes, content_type: str) -> None:
        await self._client.storage.from_(self._bucket).upload(
            path, content, {"content-type": content_type, "upsert": "true"}
        )

    async def download(self, path: str) -> bytes:
        return await self._client.storage.from_(self._bucket).download(path)

    async def delete(self, path: str) -> None:
        await self._client.storage.from_(self._bucket).remove([path])

    async def signed_url(self, path: str, expires_in_seconds: int = 3600) -> str:
        response = await self._client.storage.from_(self._bucket).create_signed_url(path, expires_in_seconds)
        return response["signedURL"]

    async def create_signed_upload_url(self, path: str) -> tuple[str, str]:
        """Mint a short-lived, single-use URL the *browser* can PUT a file to directly.

        This is the escape hatch for the Vercel serverless request-body cap (~4.5MB): the file
        bytes go browser → Supabase Storage and never transit our Next.js proxy, so the
        MAX_DOC_PACK_FILE_SIZE_BYTES limit is real. Returns `(upload_url, token)` — the url is
        absolute and already carries the token as a query param, but we also hand back the raw
        token for clients that prefer it.
        """
        response = await self._client.storage.from_(self._bucket).create_signed_upload_url(path)
        return response["signed_url"], response["token"]


_client: SupabaseStorageClient | None = None


async def get_storage_client() -> SupabaseStorageClient:
    global _client
    if _client is None:
        settings = get_settings()
        async_client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        _client = SupabaseStorageClient(async_client, settings.SUPABASE_STORAGE_BUCKET)
    return _client
