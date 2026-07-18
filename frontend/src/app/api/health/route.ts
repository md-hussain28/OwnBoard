import "server-only";
import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/api";

// Cold-start probe for the ColdStartGate. Pings the backend's unauthenticated `/health`
// (mounted at the root, NOT under `/api/v1`) so the browser can tell a spun-down Render
// free-tier dyno ("cold start", up to ~60s to wake) apart from a real outage. Deliberately
// bypasses `proxyRequest`/Clerk auth — this must answer before the user's session even matters.
export const dynamic = "force-dynamic";

// One ping's patience. The client polls this route repeatedly, so keep each attempt short
// enough to give the UI a fresh elapsed-time reading rather than hanging the whole wait.
const PING_TIMEOUT_MS = 6_000;

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(`${serverConfig.BACKEND_API_BASE_URL}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ status: "waking" }, { status: 503 });
    }
    return NextResponse.json({ status: "ok" });
  } catch {
    // Timeout or connection refused — the dyno is asleep (or genuinely down).
    return NextResponse.json({ status: "waking" }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
