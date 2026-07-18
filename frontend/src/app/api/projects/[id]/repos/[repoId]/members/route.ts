import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; repoId: string }> },
) {
  const { id, repoId } = await params;
  const body = await request.json();
  return proxyRequest("put", `/projects/${id}/repos/${repoId}/members`, { data: body });
}
