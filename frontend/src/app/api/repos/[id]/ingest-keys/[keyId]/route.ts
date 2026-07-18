import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; keyId: string }> },
) {
  const { id, keyId } = await params;
  return proxyRequest("delete", `/repos/${id}/ingest-keys/${keyId}`);
}
