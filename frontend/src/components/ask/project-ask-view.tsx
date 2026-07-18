"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  BookOpenIcon,
  FileCode2Icon,
  FolderTreeIcon,
  GitCommitHorizontalIcon,
  GraduationCapIcon,
  HelpCircleIcon,
  HistoryIcon,
  LayersIcon,
  ListChecksIcon,
  MessageSquarePlusIcon,
  PieChartIcon,
  SparklesIcon,
  TerminalIcon,
  TriangleAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, Skeleton } from "@/ui";
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
import { AskDocProvider } from "./ask-doc-viewer";
import { AskFollowupProvider } from "./ask-followup";
import { AskMessage } from "./ask-message";
import { AskThinking } from "./ask-thinking";
import { AskThreadHistory } from "./ask-thread-history";
import { useAskThreads } from "./use-ask-threads";

const SAMPLE_PROMPTS = [
  {
    icon: ListChecksIcon,
    label: "First-week ramp-up plan",
    prompt: "Give me a first-week ramp-up plan to get productive on this project.",
  },
  {
    icon: TerminalIcon,
    label: "Set up & run locally",
    prompt:
      "How do I set up and run this project locally? Show me the exact commands and the key facts I need.",
  },
  {
    icon: FolderTreeIcon,
    label: "How is the code structured?",
    prompt:
      "Map out how this project's code is structured, and show me a key snippet that explains a core part.",
  },
  {
    icon: UsersRoundIcon,
    label: "Who should I ask?",
    prompt:
      "Who knows this project best, and who should I ask if I get stuck? Flag any bus-factor risk.",
  },
  {
    icon: PieChartIcon,
    label: "What do the docs cover?",
    prompt: "Summarize what this project's documentation covers and how it breaks down.",
  },
  {
    icon: GitCommitHorizontalIcon,
    label: "What changed recently?",
    prompt: "What has changed recently in the codebase, and why does it matter for onboarding?",
  },
  {
    icon: LayersIcon,
    label: "Compare the main areas",
    prompt: "Compare the main modules or areas of this project so I know where to focus.",
  },
  {
    icon: GraduationCapIcon,
    label: "Quiz me",
    prompt: "Quiz me on the key concepts of this project to check my understanding.",
  },
  {
    icon: FileCode2Icon,
    label: "Key concepts as flashcards",
    prompt: "Make flashcards for the most important concepts and terms in this project.",
  },
  {
    icon: HelpCircleIcon,
    label: "Common questions",
    prompt: "What are the most common questions new hires ask about this project? Answer them.",
  },
  {
    icon: BookOpenIcon,
    label: "What should I read first?",
    prompt: "What are the most important documents I should read first, and why?",
  },
];

/** A handful of starter prompts shown on the empty state — kept short so the grid stays calm. */
const EMPTY_STATE_PROMPTS = SAMPLE_PROMPTS.slice(0, 4);

/** Flatten a UIMessage's text parts to a plain string (for building the backend request). */
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
          Ask this project anything
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Grounded in this project's docs, code, and commit history — answers come back with charts,
          checklists, and clickable citations, and escalate to a human when the context runs thin.
        </p>
      </div>
      <Suggestions className="max-w-xl justify-center">
        {EMPTY_STATE_PROMPTS.map((s) => (
          <Suggestion key={s.label} suggestion={s.prompt} onClick={onPick}>
            <s.icon className="size-4 shrink-0 text-brand-teal" />
            {s.label}
          </Suggestion>
        ))}
      </Suggestions>
    </ConversationEmptyState>
  );
}

function AskChat({
  projectId,
  initialMessages,
  onMessages,
}: {
  projectId: string;
  initialMessages: UIMessage[];
  onMessages: (messages: UIMessage[]) => void;
}) {
  const [input, setInput] = useState("");

  // The backend expects `{question, history}` (not the SDK's default `{messages}`) so its OpenAI
  // tool-calling loop runs server-side — the model key never reaches the browser.
  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `/api/projects/${projectId}/ask`,
        prepareSendMessagesRequest: ({ messages }) => {
          const question = messages.length ? textOf(messages[messages.length - 1]) : "";
          const history = messages
            .slice(0, -1)
            .map((m) => ({ role: m.role, content: textOf(m) }))
            .filter((t) => (t.role === "user" || t.role === "assistant") && t.content);
          return { body: { question, history } };
        },
      }),
    [projectId],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    messages: initialMessages,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  // Persist to local history whenever the conversation changes.
  useEffect(() => {
    if (messages.length > 0) onMessages(messages);
  }, [messages, onMessages]);

  function submit(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    sendMessage({ text: q });
    setInput("");
  }

  const last = messages[messages.length - 1];
  const lastAssistantEmpty =
    last?.role === "assistant" &&
    !last.parts.some((p) => (p.type === "text" && p.text) || p.type.startsWith("tool-"));
  const waitingForAnswer = busy && (last?.role !== "assistant" || lastAssistantEmpty);

  // While waiting on a fresh assistant turn, hide the empty placeholder message so the
  // thinking indicator (which carries its own avatar) doesn't render twice.
  const visibleMessages =
    waitingForAnswer && last?.role === "assistant" ? messages.slice(0, -1) : messages;

  return (
    <AskFollowupProvider value={{ ask: submit, busy }}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
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
              placeholder="Ask anything about this project — docs, decisions, code, who to ask…"
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

export function ProjectAskView({ id }: { id: string }) {
  const {
    threads,
    activeId,
    activeThread,
    hydrated,
    upsertActive,
    newThread,
    selectThread,
    removeThread,
  } = useAskThreads(id);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <AskDocProvider projectId={id}>
      {/* Fill the visible console area (viewport − topbar − main padding) so the composer pins
          to the bottom like a real chat surface instead of floating mid-page. */}
      <div className="flex h-[calc(100svh-7rem)] flex-col" data-tour="project-panel-ask">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
              <SparklesIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-sm font-semibold leading-tight text-foreground">
                Ask project
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Grounded in this project's docs, code &amp; commit history
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={newThread}>
              <MessageSquarePlusIcon />
              New
            </Button>
          </div>
        </div>

        {hydrated ? (
          <AskChat
            key={activeId}
            projectId={id}
            initialMessages={activeThread?.messages ?? []}
            onMessages={upsertActive}
          />
        ) : (
          <Skeleton className="min-h-0 w-full flex-1 rounded-2xl" />
        )}
      </div>

      <AskThreadHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        threads={threads}
        activeId={activeId}
        onSelect={selectThread}
        onNew={newThread}
        onRemove={removeThread}
      />
    </AskDocProvider>
  );
}
