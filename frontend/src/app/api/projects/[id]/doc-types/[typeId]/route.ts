import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; typeId: string }> },
) {
  const { id, typeId } = await params;
  return proxyRequest("delete", `/projects/${id}/doc-types/${typeId}`);
}
