import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  const body = await request.json();
  return proxyRequest("put", `/projects/${id}/docs/${documentId}/repos`, { data: body });
}
