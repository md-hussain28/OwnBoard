import { proxyRequest } from "@/lib/api/proxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  return proxyRequest("post", `/assignments/${id}/documents/${documentId}/ack`);
}
