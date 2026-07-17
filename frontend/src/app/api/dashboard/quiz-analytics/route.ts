import type { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/api/proxy";

export async function GET(request: NextRequest) {
  const repoId = request.nextUrl.searchParams.get("repoId") ?? undefined;
  return proxyRequest("get", "/dashboard/quiz-analytics", {
    params: repoId ? { repoId } : undefined,
  });
}
