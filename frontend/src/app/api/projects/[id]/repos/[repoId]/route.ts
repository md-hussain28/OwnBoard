import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; repoId: string }> },
) {
  const { id, repoId } = await params;
  return proxyRequest("delete", `/projects/${id}/repos/${repoId}`);
}
