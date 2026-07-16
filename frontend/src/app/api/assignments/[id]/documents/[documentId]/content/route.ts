import { proxyRequest } from "@/lib/api/proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  // Downloads + re-extracts the file server-side, so give it more than the 15s default.
  return proxyRequest("get", `/assignments/${id}/documents/${documentId}/content`, {
    timeout: 60_000,
  });
}
