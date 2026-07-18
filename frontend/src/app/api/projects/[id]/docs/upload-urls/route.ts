import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

/** Mint Supabase signed upload URLs for project reference docs. Small JSON only — the file bytes go
 * browser → Supabase directly (see lib/api/signed-upload.ts), sidestepping Vercel's body cap. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return proxyRequest("post", `/projects/${id}/docs/upload-urls`, { data: body });
}
