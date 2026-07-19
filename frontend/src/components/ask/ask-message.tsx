"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { SparklesIcon } from "lucide-react";
import { Message, MessageContent, Response } from "@/ui/ai-elements";
import { AskToolPart } from "./ask-tool-part";

/**
 * Renders one turn of the "Ask project" conversation from its AI SDK `UIMessage` parts. User turns are
 * a filled bubble; assistant turns interleave streamed Markdown (`Response`) with generative components
 * rendered from tool parts (`tool-showChart`, `tool-showCitations`, …) via `AskToolPart`.
 */
export function AskMessage({ message }: { message: UIMessage }) {
  if (message.role === "user") {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <Message from="user">
        <MessageContent variant="contained">{text}</MessageContent>
      </Message>
    );
  }

  // Sources always close out an answer: hoist any `showCitations` tool parts to the end, regardless of
  // where the model emitted them, so the evidence panel reliably lands at the bottom of the turn.
  const isCitation = (part: UIMessage["parts"][number]) =>
    isToolUIPart(part) && getToolName(part) === "showCitations";
  const bodyParts = message.parts.filter((p) => !isCitation(p));
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
        {bodyParts.map(renderPart)}
        {citationParts.map(renderPart)}
      </MessageContent>
    </Message>
  );
}
