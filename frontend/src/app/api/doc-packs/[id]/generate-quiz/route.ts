import { type NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  // Multi-step LLM pipeline (plan → draft → verify) — much slower than a CRUD call.
  return proxyRequest("post", `/doc-packs/${id}/generate-quiz`, { data: body, timeout: 300_000 });
}
