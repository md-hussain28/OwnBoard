"use client";

import {
  BarChart3Icon,
  BarChartHorizontalIcon,
  BookMarkedIcon,
  BookTextIcon,
  CheckSquareIcon,
  ClockIcon,
  CodeIcon,
  ColumnsIcon,
  FolderTreeIcon,
  GaugeIcon,
  GraduationCapIcon,
  HelpCircleIcon,
  LayersIcon,
  LightbulbIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  ListTreeIcon,
  type LucideIcon,
  MessageCircleQuestionIcon,
  QuoteIcon,
  Rows3Icon,
  StarIcon,
  Table2Icon,
  TagsIcon,
  TerminalIcon,
  UsersRoundIcon,
  WandSparklesIcon,
  WorkflowIcon,
} from "lucide-react";
import { ASK_TOOL_SCHEMAS, type AskToolName } from "@/schemas";
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
} from "./ask-blocks";
import { AskChart } from "./ask-chart";
import { AskCitationsBlock } from "./ask-citations";
import {
  AskAccordionBlock,
  AskActionsBlock,
  AskBadgesBlock,
  AskFlowBlock,
  AskGlossaryBlock,
  AskKeyTakeawaysBlock,
  AskProgressBlock,
  AskQuoteBlock,
  AskRatingBlock,
  AskStepsBlock,
  AskTableBlock,
  AskTreeBlock,
} from "./ask-extras";
import {
  AskCalloutBlock,
  AskChecklistBlock,
  AskComparisonBlock,
  AskExpertBlock,
  AskMetricsBlock,
  AskTimelineBlock,
} from "./ask-visuals";

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
  showSteps: "Laying out the steps…",
  showTable: "Building the table…",
  showProgress: "Measuring progress…",
  showRating: "Rating the levels…",
  showGlossary: "Compiling the glossary…",
  showBadges: "Tagging it up…",
  showAccordion: "Organizing the sections…",
  showQuote: "Pulling the quote…",
  showActions: "Suggesting next steps…",
  showKeyTakeaways: "Distilling the key points…",
  showTree: "Growing the tree…",
  showFlow: "Mapping the flow…",
};

/** Per-tool icon so the "building…" placeholder previews the shape of the component landing next. */
const ICON: Record<AskToolName, LucideIcon> = {
  showMetrics: GaugeIcon,
  showChart: BarChart3Icon,
  showCitations: QuoteIcon,
  showChecklist: CheckSquareIcon,
  showTimeline: ClockIcon,
  showComparison: ColumnsIcon,
  showExpert: UsersRoundIcon,
  showCallout: MessageCircleQuestionIcon,
  showCodeSnippet: CodeIcon,
  showFileTree: FolderTreeIcon,
  showCommands: TerminalIcon,
  showPeople: UsersRoundIcon,
  showFaq: HelpCircleIcon,
  showKeyValue: ListIcon,
  showQuiz: GraduationCapIcon,
  showTabs: LayersIcon,
  showFlashcards: BookMarkedIcon,
  showResources: LinkIcon,
  showSteps: ListOrderedIcon,
  showTable: Table2Icon,
  showProgress: BarChartHorizontalIcon,
  showRating: StarIcon,
  showGlossary: BookTextIcon,
  showBadges: TagsIcon,
  showAccordion: Rows3Icon,
  showQuote: QuoteIcon,
  showActions: WandSparklesIcon,
  showKeyTakeaways: LightbulbIcon,
  showTree: ListTreeIcon,
  showFlow: WorkflowIcon,
};

/**
 * Placeholder shown while a generative tool's arguments stream in. A light sweeps across the card
 * (`ask-shimmer`) over a pulsing tool icon and two building rails, so it reads as a component being
 * assembled — not a stalled spinner. Swapped for the real component the instant the input parses.
 */
function ToolSkeleton({ name }: { name: AskToolName }) {
  const Icon = ICON[name];
  return (
    <div className="ask-shimmer flex items-center gap-3 rounded-xl border border-dashed border-brand-teal/30 bg-brand-teal-soft/25 px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-teal-soft text-brand-teal">
        <Icon className="size-4 motion-safe:animate-pulse" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-brand-teal">{LABEL[name]}</span>
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-1.5 w-24 rounded-full bg-brand-teal/25" />
          <span className="h-1.5 w-12 rounded-full bg-brand-teal/15" />
        </span>
      </div>
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
    case "showSteps":
      return <AskStepsBlock data={data as never} />;
    case "showTable":
      return <AskTableBlock data={data as never} />;
    case "showProgress":
      return <AskProgressBlock data={data as never} />;
    case "showRating":
      return <AskRatingBlock data={data as never} />;
    case "showGlossary":
      return <AskGlossaryBlock data={data as never} />;
    case "showBadges":
      return <AskBadgesBlock data={data as never} />;
    case "showAccordion":
      return <AskAccordionBlock data={data as never} />;
    case "showQuote":
      return <AskQuoteBlock data={data as never} />;
    case "showActions":
      return <AskActionsBlock data={data as never} />;
    case "showKeyTakeaways":
      return <AskKeyTakeawaysBlock data={data as never} />;
    case "showTree":
      return <AskTreeBlock data={data as never} />;
    case "showFlow":
      return <AskFlowBlock data={data as never} />;
    default:
      return null;
  }
}
