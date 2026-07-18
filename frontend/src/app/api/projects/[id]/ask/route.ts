import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/api";

// Backend generation (OpenAI tool-calling) can run past the default serverless budget.
export const maxDuration = 60;

/**
 * Streaming proxy for "Ask project" Q&A. Generation + retrieval run on the FastAPI backend (so the
 * OpenAI key stays server-side, backend-only). The shared `proxyRequest` helper buffers the whole
 * body, which would defeat streaming — so this handler forwards the backend SSE stream through
 * untouched, only attaching the caller's Clerk token server-side.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();
  const body = await req.text();

  let backendRes: Response;
  try {
    backendRes = await fetch(`${serverConfig.BACKEND_API_BASE_URL}/api/v1/projects/${id}/ask`, {
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

  // Non-stream error (e.g. 401/404/501) — forward as JSON so the client can show it.
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
      // Tells the AI SDK client this SSE body is the Vercel UI-message-stream protocol.
      "x-vercel-ai-ui-message-stream":
        backendRes.headers.get("x-vercel-ai-ui-message-stream") ?? "v1",
    },
  });
}
