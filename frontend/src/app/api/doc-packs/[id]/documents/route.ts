import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

/** Multipart upload — forward the browser's FormData; axios sets the multipart boundary itself. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await request.formData();
  return proxyRequest("post", `/doc-packs/${id}/documents`, {
    data: form,
    headers: { "Content-Type": null }, // drop the instance JSON default so axios can set multipart
    timeout: 120_000,
  });
}
