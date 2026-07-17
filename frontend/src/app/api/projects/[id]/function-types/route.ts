import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest("get", `/projects/${id}/function-types`);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return proxyRequest("post", `/projects/${id}/function-types`, { data: body });
}
