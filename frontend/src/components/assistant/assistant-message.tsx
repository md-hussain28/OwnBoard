"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { SparklesIcon } from "lucide-react";
import { AskToolPart } from "@/components/ask";
import { type AssistantAction, assistantActionSchema } from "@/schemas";
import { Message, MessageContent, Response } from "@/ui/ai-elements";
import { AssistantActivity } from "./assistant-activity";

/**
 * Renders one turn of the admin AI Assistant. Like `AskMessage` it interleaves streamed Markdown with
 * generative-UI components, but it ALSO surfaces the agent's real tool steps: `data-action` parts
 * (streamed by the backend tool loop) are collected into an `AssistantActivity` timeline pinned to
 * the top of the turn, so the answer reads as "here's what I did, here's the result" rather than a
 * chat reply. Citations are still hoisted to the very end.
 */
export function AssistantMessage({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <Message from="user">
        <MessageContent variant="contained">{text}</MessageContent>
      </Message>
    );
  }

  // Agent steps: AI SDK reconciles `data-action` frames by id, so each part already holds the latest
  // running/done state — collect them (in emit order) into the activity timeline.
  const actions: AssistantAction[] = [];
  for (const part of message.parts) {
    if (part.type === "data-action") {
      const parsed = assistantActionSchema.safeParse((part as { data?: unknown }).data);
      if (parsed.success) actions.push(parsed.data);
    }
  }

  const isCitation = (part: UIMessage["parts"][number]) =>
    isToolUIPart(part) && getToolName(part) === "showCitations";
  const bodyParts = message.parts.filter((p) => p.type !== "data-action" && !isCitation(p));
  const citationParts = message.parts.filter(isCitation);

  const renderPart = (part: UIMessage["parts"][number], i: number) => {
    if (part.type === "text") {
      return part.text ? <Response key={`text-${i}`}>{part.text}</Response> : null;
    }
    if (isToolUIPart(part)) {
      return (
        <AskToolPart
          key={part.toolCallId}
          toolName={getToolName(part)}
          input={part.input}
          state={part.state}
        />
      );
    }
    return null;
  };

  return (
    <Message from="assistant">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
        <SparklesIcon className="size-4" />
      </div>
      <MessageContent>
        {actions.length > 0 && <AssistantActivity actions={actions} />}
        {bodyParts.map(renderPart)}
        {citationParts.map(renderPart)}
      </MessageContent>
    </Message>
  );
}
