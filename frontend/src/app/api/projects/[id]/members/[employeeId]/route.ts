import { proxyRequest } from "@/lib/api/proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> },
) {
  const { id, employeeId } = await params;
  return proxyRequest("delete", `/projects/${id}/members/${employeeId}`);
}
