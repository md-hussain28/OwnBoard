import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; functionTypeId: string }> },
) {
  const { id, functionTypeId } = await params;
  const body = await request.json();
  return proxyRequest("patch", `/projects/${id}/function-types/${functionTypeId}`, { data: body });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; functionTypeId: string }> },
) {
  const { id, functionTypeId } = await params;
  return proxyRequest("delete", `/projects/${id}/function-types/${functionTypeId}`);
}
