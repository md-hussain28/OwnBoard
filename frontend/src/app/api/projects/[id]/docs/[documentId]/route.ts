import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  return proxyRequest("delete", `/projects/${id}/docs/${documentId}`);
}
