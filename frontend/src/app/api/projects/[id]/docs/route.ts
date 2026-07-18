import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyRequest("get", `/projects/${id}/docs`);
}

/** Multipart upload — forward the browser's FormData; axios sets the multipart boundary itself. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  return proxyRequest("post", `/projects/${id}/docs`, {
    data: form,
    headers: { "Content-Type": null },
    timeout: 120_000,
  });
}
