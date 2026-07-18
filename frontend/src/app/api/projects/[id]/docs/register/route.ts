import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

/** Register objects the browser already uploaded to storage; backend creates rows, starts ingest,
 * and returns the refreshed project docs surface. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return proxyRequest("post", `/projects/${id}/docs/register`, { data: body });
}
