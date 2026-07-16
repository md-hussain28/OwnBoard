import { type NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

/** Lightweight ingestion-progress poll — keep this cheap, it fires every few seconds during processing. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest("get", `/doc-packs/${id}/documents/status`);
}
