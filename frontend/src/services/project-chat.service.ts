import { API_ENDPOINTS } from "@/lib/api/endpoint";

export type AskProjectCitation = { filePath: string; source: "doc" | "code" };

export type AskProjectHandlers = {
  onToken: (text: string) => void;
  onCitations?: (citations: AskProjectCitation[]) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
};

/**
 * Streaming "Ask project" Q&A. Unlike the rest of the service layer (axios + zod),
 * this reads a Server-Sent-Events stream token-by-token, so it uses `fetch` +
 * `ReadableStream` directly against the streaming proxy route. Wire contract lives
 * in the backend project-chat router.
 */
export async function askProjectStream(
  projectId: string,
  question: string,
  handlers: AskProjectHandlers,
  signal?: AbortSignal,
): Promise<void> {
  // The api-client's "/api" baseURL is added by axios; this raw fetch prepends it itself.
  const res = await fetch(`/api${API_ENDPOINTS.projectAsk(projectId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError?.(
      res.status === 501
        ? "Ask project isn't wired up on the backend yet."
        : `Something went wrong reaching the backend (${res.status}).`,
    );
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
      sep = buffer.indexOf("\n\n");
      if (!dataLine) continue;
      const payload = dataLine.slice(5).trim();
      if (!payload) continue;
      let evt: { type?: string; text?: string; citations?: AskProjectCitation[]; message?: string };
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === "token") handlers.onToken(evt.text ?? "");
      else if (evt.type === "citations") handlers.onCitations?.(evt.citations ?? []);
      else if (evt.type === "error") handlers.onError?.(evt.message ?? "Something went wrong.");
      else if (evt.type === "done") {
        handlers.onDone?.();
        return;
      }
    }
  }
  handlers.onDone?.();
}
