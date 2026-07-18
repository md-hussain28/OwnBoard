import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // Archaeology answers call the LLM — allow more than the default 15s.
  return proxyRequest("post", `/repos/${id}/chat/ask`, { data: body, timeout: 45_000 });
}
