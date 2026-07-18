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
import { AskDocProvider } from "@/components/ask/ask-doc-viewer";
import { AskMessage } from "@/components/ask/ask-message";
import { AskThreadHistory } from "@/components/ask/ask-thread-history";
import { useAskThreads } from "@/components/ask/use-ask-threads";
import { ProjectSectionHeader } from "@/components/project/project-section-header";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/ui/ai-elements/conversation";
import { Loader } from "@/ui/ai-elements/loader";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/ui/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/ui/ai-elements/suggestion";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";

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

/** Flatten a UIMessage's text parts to a plain string (for building the backend request). */
function textOf(message: UIMessage): string {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <ConversationEmptyState className="gap-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-honey-soft text-brand-honey">
        <SparklesIcon className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-semibold text-foreground">
          Ask this project anything
        </p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Grounded in this project's docs, code, and commit history. Answers come back with charts,
          checklists, and clickable citations — and escalate to a human when the context runs thin.
        </p>
      </div>
      <Suggestions className="max-w-xl justify-center">
        {SAMPLE_PROMPTS.map((s) => (
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
  const waitingForAnswer =
    busy &&
    (last?.role !== "assistant" ||
      !last.parts.some((p) => (p.type === "text" && p.text) || p.type.startsWith("tool-")));

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <Conversation className="max-h-[62vh] min-h-[44vh]">
          <ConversationContent>
            {messages.length === 0 ? (
              <EmptyState onPick={submit} />
            ) : (
              messages.map((m) => <AskMessage key={m.id} message={m} />)
            )}

            {waitingForAnswer && <Loader label="Reading the project's docs and code…" />}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                <span>{error.message || "The assistant hit an error. Please try again."}</span>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

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
          <span className="text-xs text-muted-foreground">
            <kbd className="rounded border border-border bg-muted px-1 font-sans">Enter</kbd> to
            send ·{" "}
            <kbd className="rounded border border-border bg-muted px-1 font-sans">Shift+Enter</kbd>{" "}
            for a new line
          </span>
          <PromptInputSubmit status={status} onStop={stop} disabled={!input.trim()} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
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
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <ProjectSectionHeader
          icon={SparklesIcon}
          title="Ask project"
          description="An AI teammate that answers from this project's docs and code — with charts, checklists, and citations you can open."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                <HistoryIcon />
                History
              </Button>
              <Button variant="outline" size="sm" onClick={newThread}>
                <MessageSquarePlusIcon />
                New
              </Button>
            </div>
          }
        />

        {hydrated ? (
          <AskChat
            key={activeId}
            projectId={id}
            initialMessages={activeThread?.messages ?? []}
            onMessages={upsertActive}
          />
        ) : (
          <Skeleton className="min-h-[44vh] w-full rounded-xl" />
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
