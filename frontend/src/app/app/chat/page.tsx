"use client";

import { useState } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ExpertReferralCard } from "@/components/expert/expert-referral-card";
import { ConnectRepoPrompt } from "@/components/repo/connect-repo-prompt";
import { useAskCodebase } from "@/hooks/queries/chat/chat.mutations";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { isNotImplementedError } from "@/lib/api/errors";
import { ID_PREFIXES, typedId } from "@/lib/ids";
import type { ArchaeologyCitation, ChatMessage as ChatMessageType } from "@/schemas/chat.schema";
import type { ExpertReferral } from "@/schemas/expert.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import { Spinner } from "@/ui/spinner";

const WELCOME_MESSAGE: ChatMessageType = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me why the code works the way it does — e.g. \"why is this retry loop here?\" — and I'll answer grounded in the code and commits, with citations. If I'm not sure, I'll route you to the right person instead of guessing.",
};

type LastAnswer = {
  citations: ArchaeologyCitation[];
  expert: ExpertReferral | null;
  escalated: boolean;
};

export default function ChatPage() {
  const { data: repos, isLoading: reposLoading } = useRepos();
  const repo = repos?.[0];

  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);
  const [input, setInput] = useState("");
  const ask = useAskCodebase();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !repo) return;

    setMessages((prev) => [
      ...prev,
      { id: typedId(ID_PREFIXES.message), role: "user", content: trimmed },
    ]);
    setInput("");
    setLastAnswer(null);

    ask.mutate(
      { repoId: repo.id, question: trimmed },
      {
        onSuccess: (answer) => {
          setMessages((prev) => [
            ...prev,
            {
              id: typedId(ID_PREFIXES.message),
              role: "assistant",
              content: answer.answer,
              confidence: answer.escalated ? "low" : "high",
            },
          ]);
          setLastAnswer({
            citations: answer.citations,
            expert: answer.expert
              ? {
                  contributorId: "",
                  contributorName: answer.expert.contributorName,
                  confidence: 0,
                  evidence: answer.expert.evidence,
                  draftMessage: answer.expert.draftMessage,
                  backupContributorName: null,
                }
              : null,
            escalated: answer.escalated,
          });
        },
        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            {
              id: typedId(ID_PREFIXES.message),
              role: "assistant",
              content: isNotImplementedError(error)
                ? "Archaeology Q&A isn't wired up on the backend yet."
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
        <h1 className="text-2xl font-semibold">Ask the codebase</h1>
        <p className="text-muted-foreground">
          Cited, commit-grounded answers about why the code is the way it is.
        </p>
      </div>

      {reposLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {!reposLoading && !repo && <ConnectRepoPrompt />}

      {repo && (
        <>
          <div className="space-y-4 rounded-lg border p-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {ask.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="text-brand-teal" />
                Searching code and commits for a cited answer…
              </div>
            )}
            {lastAnswer && lastAnswer.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lastAnswer.citations.map((c) => (
                  <Badge
                    key={`${c.filePath}-${c.commitSha ?? ""}`}
                    variant="secondary"
                    className="font-mono"
                  >
                    {c.commitSha ? `${c.filePath} @ ${c.commitSha.slice(0, 7)}` : c.filePath}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {lastAnswer?.escalated && lastAnswer.expert && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-amber">
                Not confident enough to answer — routing you to an expert.
              </p>
              <ExpertReferralCard referral={lastAnswer.expert} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Why is this retry loop here?"
            />
            <Button type="submit" disabled={ask.isPending}>
              {ask.isPending && <Spinner />}
              {ask.isPending ? "Asking..." : "Ask"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
