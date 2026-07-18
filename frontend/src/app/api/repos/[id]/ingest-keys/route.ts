import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest("get", `/repos/${id}/ingest-keys`);
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest("post", `/repos/${id}/ingest-keys`, { data: {} });
}
