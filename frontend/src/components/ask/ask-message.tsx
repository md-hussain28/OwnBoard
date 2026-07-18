"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { SparklesIcon } from "lucide-react";
import { AskToolPart } from "@/components/ask/ask-tool-part";
import { Message, MessageContent } from "@/ui/ai-elements/message";
import { Response } from "@/ui/ai-elements/response";

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

  return (
    <Message from="assistant">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
        <SparklesIcon className="size-4" />
      </div>
      <MessageContent>
        {message.parts.map((part, i) => {
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
        })}
      </MessageContent>
    </Message>
  );
}
