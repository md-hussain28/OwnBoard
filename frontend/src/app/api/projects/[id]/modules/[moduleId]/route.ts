import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) {
  const { id, moduleId } = await params;
  const body = await request.json();
  return proxyRequest("patch", `/projects/${id}/modules/${moduleId}`, { data: body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) {
  const { id, moduleId } = await params;
  return proxyRequest("delete", `/projects/${id}/modules/${moduleId}`);
}
