import type { NextRequest } from "next/server";
import { API_ENDPOINTS } from "@/lib/api";
import { proxyRequest } from "@/lib/api/proxy";

/** Ordered extracted text for one project document — backs the citation → viewer sheet. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id, documentId } = await params;
  return proxyRequest("get", API_ENDPOINTS.projectDocContent(id, documentId));
}
