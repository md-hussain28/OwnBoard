"use client";

import { SparklesIcon } from "lucide-react";
import { useRef, useState } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ID_PREFIXES, typedId } from "@/lib/ids";
import type { ChatMessage as ChatMessageType } from "@/schemas/chat.schema";
import { type AskProjectCitation, askProjectStream } from "@/services/project-chat.service";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";

const WELCOME: ChatMessageType = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me anything about this project — its docs, decisions, or codebase. I answer from the project's uploaded docs and connected repo, and cite what I used. If I don't have the context, I'll say so rather than guess.",
};

export function ProjectAskView({ id }: { id: string }) {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME]);
  const [citations, setCitations] = useState<AskProjectCitation[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const activeIdRef = useRef<string | null>(null);

  function appendToActive(text: string) {
    const activeId = activeIdRef.current;
    if (!activeId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === activeId ? { ...m, content: m.content + text } : m)),
    );
  }

  function setActiveContent(content: string, confidence?: "high" | "low") {
    const activeId = activeIdRef.current;
    if (!activeId) return;
    setMessages((prev) => prev.map((m) => (m.id === activeId ? { ...m, content, confidence } : m)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    const assistantId = typedId(ID_PREFIXES.message);
    activeIdRef.current = assistantId;
    setMessages((prev) => [
      ...prev,
      { id: typedId(ID_PREFIXES.message), role: "user", content: question },
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setInput("");
    setCitations([]);
    setStreaming(true);

    await askProjectStream(id, question, {
      onToken: (text) => appendToActive(text),
      onCitations: (list) => setCitations(list),
      onError: (message) => setActiveContent(message, "low"),
      onDone: () => setStreaming(false),
    });
    setStreaming(false);
  }

  const activeId = activeIdRef.current;
  const waitingForFirstToken = streaming && messages.find((m) => m.id === activeId)?.content === "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-5 text-brand-teal" />
        <div>
          <h2 className="text-lg font-semibold">Ask project</h2>
          <p className="text-sm text-muted-foreground">
            Cited answers grounded in this project&apos;s docs and codebase.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {waitingForFirstToken && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="text-brand-teal" />
            Reading the project&apos;s docs and code…
          </div>
        )}
        {!streaming && citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {citations.map((c) => (
              <Badge key={`${c.source}-${c.filePath}`} variant="secondary" className="font-mono">
                {c.filePath}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="How does auth work in this project?"
          disabled={streaming}
        />
        <Button type="submit" disabled={streaming || !input.trim()}>
          {streaming && <Spinner />}
          {streaming ? "Asking…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
