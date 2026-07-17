"use client";

import { useState } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ExpertIntroCard } from "@/components/chat/expert-intro-card";
import { IncomingBadge } from "@/components/layout/incoming-feature";
import { DEMO_REPO_ID } from "@/constants/app";
import { useSendChatMessage } from "@/hooks/queries/chat/chat.mutations";
import { isNotImplementedError } from "@/lib/api/errors";
import type { ChatMessage as ChatMessageType, ExpertRouting } from "@/schemas/chat.schema";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

const WELCOME_MESSAGE: ChatMessageType = {
  id: "welcome",
  role: "assistant",
  content:
    'Ask me why the code works the way it does — e.g. "why is this retry loop here?" — and I\'ll answer with a citation to the commit that explains it.',
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [expertRouting, setExpertRouting] = useState<ExpertRouting | null>(null);
  const [input, setInput] = useState("");
  const sendMessage = useSendChatMessage();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setExpertRouting(null);

    sendMessage.mutate(
      { repoId: DEMO_REPO_ID, message: trimmed },
      {
        onSuccess: (response) => {
          setMessages((prev) => [...prev, response.message]);
          setExpertRouting(response.expertRouting ?? null);
        },
        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: isNotImplementedError(error)
                ? "Archaeology Q&A is still being built. Once it's wired up, answers will appear here with a commit citation."
                : "Something went wrong reaching the backend — try again in a moment.",
            },
          ]);
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Archaeology Q&A</h1>
          <IncomingBadge />
        </div>
        <p className="text-muted-foreground">
          Cited, commit-grounded answers about why the code is the way it is.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {expertRouting && <ExpertIntroCard routing={expertRouting} />}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why is this retry loop here?"
        />
        <Button type="submit" disabled={sendMessage.isPending}>
          {sendMessage.isPending ? "Asking..." : "Ask"}
        </Button>
      </form>
    </div>
  );
}
