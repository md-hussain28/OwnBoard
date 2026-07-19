import { z } from "zod";

/**
 * One executed step of the admin AI Assistant's agentic loop, streamed as an AI SDK `data-action`
 * part (see backend `vercel_stream.py`). The backend emits a `running` frame then a `done` frame with
 * the SAME tool-call id, so `useChat` reconciles them into a single part that updates in place — the
 * UI shows the agent working, then the real outcome. `kind` separates data lookups from mutations;
 * `ok`/`summary` describe what actually happened once `phase` is `done`.
 */
export const assistantActionSchema = z.object({
  name: z.string(),
  kind: z.enum(["read", "write"]).default("read"),
  phase: z.enum(["running", "done"]).default("running"),
  title: z.string().nullish(),
  ok: z.boolean().nullish(),
  summary: z.string().nullish(),
});

export type AssistantAction = z.infer<typeof assistantActionSchema>;
