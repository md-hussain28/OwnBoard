import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trackId: string }> },
) {
  const { id, trackId } = await params;
  const body = await request.json();
  return proxyRequest("put", `/projects/${id}/tracks/${trackId}/assignment`, { data: body });
}
