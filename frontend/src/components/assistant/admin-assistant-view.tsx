"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  BarChart3Icon,
  ClipboardListIcon,
  MessageSquarePlusIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AskFollowupProvider, AskMessage, AskThinking } from "@/components/ask";
import { Button } from "@/ui";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  Suggestion,
  Suggestions,
} from "@/ui/ai-elements";

/**
 * Admin "AI Assistant" — a generative-UI chat that answers org-wide onboarding analytics AND performs
 * admin actions (add a member, create a person, assign onboarding) by driving real backend tools. It
 * reuses the "Ask project" rendering stack (`AskMessage` → `AskToolPart` → the component catalog) so
 * every answer comes back as interactive metrics/charts/tables/callouts; the backend runs the agentic
 * tool loop over `/api/admin/assistant`.
 */

const SAMPLE_PROMPTS = [
  {
    icon: BarChart3Icon,
    label: "Passed vs failed",
    prompt: "How many people have passed vs failed their onboarding? Show the breakdown.",
  },
  {
    icon: ClipboardListIcon,
    label: "Who hasn't started",
    prompt: "Who hasn't started their onboarding yet, and what's overdue?",
  },
  {
    icon: UsersRoundIcon,
    label: "Project headcounts",
    prompt: "Compare my projects by number of members and onboarding completion.",
  },
  {
    icon: UserPlusIcon,
    label: "Add a member",
    prompt: "Add a member to one of my projects.",
  },
  {
    icon: SparklesIcon,
    label: "Assign a track",
    prompt: "Assign an onboarding track to a new hire.",
  },
  {
    icon: ClipboardListIcon,
    label: "Recent outcomes",
    prompt: "Show the most recent onboarding pass/fail outcomes.",
  },
];

// Split the starters to make the agent's dual nature legible: it answers questions AND does work.
const ASK_PROMPTS = SAMPLE_PROMPTS.slice(0, 3);
const ACT_PROMPTS = SAMPLE_PROMPTS.slice(3);

function textOf(message: UIMessage): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <ConversationEmptyState className="gap-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-honey-soft text-brand-honey shadow-soft">
        <SparklesIcon className="size-7" />
      </span>
      <div className="space-y-1.5">
        <p className="font-heading text-lg font-semibold text-foreground">
          Your onboarding co-pilot
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Tell me what you need in plain English. I read your org's live onboarding data and take
          real actions on your behalf — no forms, no clicking around.
        </p>
      </div>
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-2">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Ask about
          </p>
          <Suggestions className="justify-center">
            {ASK_PROMPTS.map((s) => (
              <Suggestion key={s.label} suggestion={s.prompt} onClick={onPick}>
                <s.icon className="size-4 shrink-0 text-brand-teal" />
                {s.label}
              </Suggestion>
            ))}
          </Suggestions>
        </div>
        <div className="space-y-2">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Or have me do it
          </p>
          <Suggestions className="justify-center">
            {ACT_PROMPTS.map((s) => (
              <Suggestion key={s.label} suggestion={s.prompt} onClick={onPick}>
                <s.icon className="size-4 shrink-0 text-brand-honey" />
                {s.label}
              </Suggestion>
            ))}
          </Suggestions>
        </div>
      </div>
    </ConversationEmptyState>
  );
}

function AssistantChat() {
  const [input, setInput] = useState("");
  const [resetKey, setResetKey] = useState(0);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/admin/assistant",
        prepareSendMessagesRequest: ({ messages }) => {
          const question = messages.length ? textOf(messages[messages.length - 1]) : "";
          const history = messages
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: textOf(m) }))
            .filter((t) => (t.role === "user" || t.role === "assistant") && t.content);
          return { body: { question, history } };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    sendMessage({ text: q });
    setInput("");
  }

  function newChat() {
    if (busy) stop();
    setMessages([]);
    setInput("");
    setResetKey((k) => k + 1);
  }

  const last = messages[messages.length - 1];
  const lastAssistantEmpty =
    last?.role === "assistant" &&
    !last.parts.some((p) => (p.type === "text" && p.text) || p.type.startsWith("tool-"));
  const waitingForAnswer = busy && (last?.role !== "assistant" || lastAssistantEmpty);
  const visibleMessages =
    waitingForAnswer && last?.role === "assistant" ? messages.slice(0, -1) : messages;

  return (
    <AskFollowupProvider value={{ ask: submit, busy }}>
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
            <SparklesIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-sm font-semibold leading-tight text-foreground">
                AI Assistant
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-teal-soft px-1.5 py-0.5 text-[0.625rem] font-medium text-brand-teal">
                <span aria-hidden className="size-1.5 rounded-full bg-brand-teal" />
                {busy ? "Working" : "Ready"}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              Reads your onboarding data &amp; takes action on your behalf
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={newChat} disabled={messages.length === 0}>
          <MessageSquarePlusIcon />
          New session
        </Button>
      </div>

      <div key={resetKey} className="flex min-h-0 flex-1 flex-col gap-3">
        <Conversation className="min-h-0 flex-1">
          <ConversationContent
            className={
              messages.length === 0
                ? "mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center"
                : "mx-auto w-full max-w-3xl"
            }
          >
            {messages.length === 0 ? (
              <EmptyState onPick={submit} />
            ) : (
              visibleMessages.map((m) => <AskMessage key={m.id} message={m} />)
            )}

            {waitingForAnswer && <AskThinking className="w-full py-1" />}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>{error.message || "The assistant hit an error. Please try again."}</span>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <PromptInputTextarea
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about onboarding progress, or tell me to add a member, create a hire, assign a track…"
            />
            <PromptInputToolbar>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                <kbd className="rounded border border-border bg-muted px-1 font-sans">Enter</kbd> to
                send ·{" "}
                <kbd className="rounded border border-border bg-muted px-1 font-sans">
                  Shift+Enter
                </kbd>{" "}
                for a new line
              </span>
              <PromptInputSubmit
                status={status}
                onStop={stop}
                disabled={!input.trim()}
                className="ml-auto"
              />
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </AskFollowupProvider>
  );
}

export function AdminAssistantView() {
  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col">
      <AssistantChat />
    </div>
  );
}
