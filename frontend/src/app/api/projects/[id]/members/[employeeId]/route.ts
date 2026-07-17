import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; employeeId: string }> },
) {
  const { id, employeeId } = await params;
  const body = await request.json();
  return proxyRequest("patch", `/projects/${id}/members/${employeeId}`, { data: body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; employeeId: string }> },
) {
  const { id, employeeId } = await params;
  return proxyRequest("delete", `/projects/${id}/members/${employeeId}`);
}
