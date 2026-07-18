"use client";

import {
  AskCodeSnippetBlock,
  AskCommandsBlock,
  AskFaqBlock,
  AskFileTreeBlock,
  AskFlashcardsBlock,
  AskKeyValueBlock,
  AskPeopleBlock,
  AskQuizBlock,
  AskResourcesBlock,
  AskTabsBlock,
} from "@/components/ask/ask-blocks";
import { AskChart } from "@/components/ask/ask-chart";
import { AskCitationsBlock } from "@/components/ask/ask-citations";
import {
  AskCalloutBlock,
  AskChecklistBlock,
  AskComparisonBlock,
  AskExpertBlock,
  AskMetricsBlock,
  AskTimelineBlock,
} from "@/components/ask/ask-visuals";
import { ASK_TOOL_SCHEMAS, type AskToolName } from "@/schemas/ask.schema";
import { Spinner } from "@/ui/spinner";

const LABEL: Record<AskToolName, string> = {
  showMetrics: "Summarizing the numbers…",
  showChart: "Charting the data…",
  showCitations: "Gathering sources…",
  showChecklist: "Building your checklist…",
  showTimeline: "Laying out the timeline…",
  showComparison: "Comparing options…",
  showExpert: "Finding who to ask…",
  showCallout: "Adding a note…",
  showCodeSnippet: "Pulling up the code…",
  showFileTree: "Mapping the file tree…",
  showCommands: "Assembling the commands…",
  showPeople: "Gathering the contributors…",
  showFaq: "Answering common questions…",
  showKeyValue: "Compiling the facts…",
  showQuiz: "Writing a quick check…",
  showTabs: "Organizing the sections…",
  showFlashcards: "Making flashcards…",
  showResources: "Collecting resources…",
};

function ToolSkeleton({ name }: { name: AskToolName }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
      <Spinner className="text-brand-teal" />
      {LABEL[name]}
    </div>
  );
}

function isAskTool(name: string): name is AskToolName {
  return name in ASK_TOOL_SCHEMAS;
}

/** Renders one generative tool call as its component, safe-parsing partial/streaming input. */
export function AskToolPart({
  toolName,
  input,
  state,
}: {
  toolName: string;
  input: unknown;
  state: string;
}) {
  if (!isAskTool(toolName)) return null;

  const parsed = ASK_TOOL_SCHEMAS[toolName].safeParse(input);
  if (!parsed.success) {
    // Input is still streaming in (or the model produced something incomplete).
    return state === "output-error" ? null : <ToolSkeleton name={toolName} />;
  }
  const data = parsed.data;

  switch (toolName) {
    case "showMetrics":
      return <AskMetricsBlock data={data as never} />;
    case "showChart":
      return <AskChart chart={data as never} />;
    case "showCitations":
      return <AskCitationsBlock data={data as never} />;
    case "showChecklist":
      return <AskChecklistBlock data={data as never} />;
    case "showTimeline":
      return <AskTimelineBlock data={data as never} />;
    case "showComparison":
      return <AskComparisonBlock data={data as never} />;
    case "showExpert":
      return <AskExpertBlock data={data as never} />;
    case "showCallout":
      return <AskCalloutBlock data={data as never} />;
    case "showCodeSnippet":
      return <AskCodeSnippetBlock data={data as never} />;
    case "showFileTree":
      return <AskFileTreeBlock data={data as never} />;
    case "showCommands":
      return <AskCommandsBlock data={data as never} />;
    case "showPeople":
      return <AskPeopleBlock data={data as never} />;
    case "showFaq":
      return <AskFaqBlock data={data as never} />;
    case "showKeyValue":
      return <AskKeyValueBlock data={data as never} />;
    case "showQuiz":
      return <AskQuizBlock data={data as never} />;
    case "showTabs":
      return <AskTabsBlock data={data as never} />;
    case "showFlashcards":
      return <AskFlashcardsBlock data={data as never} />;
    case "showResources":
      return <AskResourcesBlock data={data as never} />;
    default:
      return null;
  }
}
