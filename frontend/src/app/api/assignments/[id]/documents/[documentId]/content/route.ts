import { proxyRequest } from "@/lib/api/proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  // PDFs only mint a signed URL; text docs still download + extract.
  return proxyRequest("get", `/assignments/${id}/documents/${documentId}/content`, {
    timeout: 60_000,
  });
}
