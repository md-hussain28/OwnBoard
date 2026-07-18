import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

/** Mint Supabase signed upload URLs. Small JSON in/out — the file bytes go browser → Supabase
 * directly (see lib/api/signed-upload.ts), so this proxied request stays well under Vercel's cap. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return proxyRequest("post", `/doc-packs/${id}/documents/upload-urls`, { data: body });
}
