import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/api";

// The admin assistant runs a multi-step tool loop (fetch stats, resolve ids, mutate) — allow headroom.
export const maxDuration = 60;

/**
 * Streaming proxy for the admin "AI Assistant". Generation + all tool execution (analytics reads and
 * admin mutations) run on the FastAPI backend, so the OpenAI key stays server-side and every action is
 * authorized server-side (the endpoint is admin-gated). Like the project-ask proxy, this forwards the
 * backend SSE stream through untouched, only attaching the caller's Clerk token.
 */
export async function POST(req: Request) {
  const { getToken } = await auth();
  const token = await getToken();
  const body = await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${serverConfig.BACKEND_API_BASE_URL}/api/v1/admin/assistant/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: error instanceof Error ? error.message : "unknown" },
      { status: 503 },
    );
  }

  // Non-stream error (e.g. 401/403/501) — forward as JSON so the client can show it.
  if (!backendRes.ok || !backendRes.body) {
    const text = await backendRes.text();
    return new NextResponse(text || null, {
      status: backendRes.status,
      headers: { "Content-Type": backendRes.headers.get("Content-Type") ?? "application/json" },
    });
  }

  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "x-vercel-ai-ui-message-stream":
        backendRes.headers.get("x-vercel-ai-ui-message-stream") ?? "v1",
    },
  });
}
