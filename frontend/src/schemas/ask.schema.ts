import { z } from "zod";
import {
  askAccordionSchema,
  askActionsSchema,
  askBadgesSchema,
  askFlowSchema,
  askGlossarySchema,
  askKeyTakeawaysSchema,
  askProgressSchema,
  askQuoteSchema,
  askRatingSchema,
  askStepsSchema,
  askTableSchema,
  askTreeSchema,
} from "./ask-extra.schema";
import {
  askAnnotatedCodeSchema,
  askApiEndpointSchema,
  askConfidenceCheckSchema,
  askDecisionTreeSchema,
  askDiffSchema,
  askEnvVarsSchema,
  askProsConsSchema,
} from "./ask-more.schema";

/**
 * Generative-UI contract for "Ask project".
 *
 * Each schema below is BOTH a Vercel AI SDK tool `inputSchema` (server route) AND the prop type for
 * its React renderer (client). The model chooses which component to emit and fills the data; we render
 * `part.input` verbatim. Keep these lean and descriptive — the field `.describe()`s are the only
 * spec the model gets for how to populate a component, so they double as prompt engineering.
 */

// ── Charts ──────────────────────────────────────────────────────────────────
export const askChartTypeSchema = z.enum(["bar", "line", "area", "pie", "donut", "radar"]);
export type AskChartType = z.infer<typeof askChartTypeSchema>;

export const askChartPointSchema = z.object({
  label: z
    .string()
    .describe("Category / x-axis label, e.g. a service name, month, or contributor."),
  value: z.number().describe("Numeric value for this point."),
});

export const askChartSchema = z.object({
  type: askChartTypeSchema.describe(
    "bar = compare categories; line/area = trend over an ordered axis; pie/donut = share of a whole; radar = multi-axis profile.",
  ),
  title: z.string().describe("Short chart title."),
  subtitle: z.string().optional().describe("Optional one-line caption under the title."),
  unit: z.string().optional().describe("Optional value unit, e.g. '%', 'commits', 'files'."),
  data: z
    .array(askChartPointSchema)
    .min(1)
    .max(12)
    .describe("2–12 data points. Order matters for line/area."),
});
export type AskChart = z.infer<typeof askChartSchema>;

// ── Metric / KPI tiles ────────────────────────────────────────────────────────
export const askMetricSchema = z.object({
  label: z.string().describe("What the number measures, e.g. 'Bus factor', 'Docs indexed'."),
  value: z.string().describe("The value as display text, e.g. '3', '82%', '12 files'."),
  hint: z.string().optional().describe("Optional one-line context."),
  intent: z
    .enum(["neutral", "positive", "warning", "danger"])
    .optional()
    .describe("Color intent: positive=healthy, warning=watch, danger=risk."),
  delta: z.string().optional().describe("Optional change indicator, e.g. '+4 this week'."),
});

export const askMetricsSchema = z.object({
  title: z.string().optional().describe("Optional heading above the tiles."),
  metrics: z.array(askMetricSchema).min(1).max(6).describe("1–6 KPI tiles."),
});
export type AskMetrics = z.infer<typeof askMetricsSchema>;

// ── Citations (open the source doc/code) ──────────────────────────────────────
export const askCitationSchema = z.object({
  documentId: z
    .string()
    .optional()
    .describe(
      "EXACT document_id from the provided context — required for doc sources so it can open.",
    ),
  title: z.string().describe("Document title or file path shown on the chip."),
  source: z.enum(["doc", "code", "commit"]).describe("Where the evidence came from."),
  snippet: z
    .string()
    .optional()
    .describe("Short quoted passage (≤240 chars) that supports the claim."),
  filePath: z.string().optional().describe("File path for code sources."),
});

export const askCitationsSchema = z.object({
  title: z.string().optional().describe("Optional heading, defaults to 'Sources'."),
  citations: z.array(askCitationSchema).min(1).max(8).describe("The sources used to answer."),
});
export type AskCitations = z.infer<typeof askCitationsSchema>;
export type AskCitation = z.infer<typeof askCitationSchema>;

// ── Checklist / next steps ────────────────────────────────────────────────────
export const askChecklistItemSchema = z.object({
  title: z.string().describe("The action, imperative and specific."),
  detail: z.string().optional().describe("Optional one-line elaboration."),
  done: z.boolean().optional().describe("Whether this is already complete (renders checked)."),
});

export const askChecklistSchema = z.object({
  title: z.string().describe("Checklist heading, e.g. 'Your first-week ramp-up'."),
  intro: z.string().optional().describe("Optional lead-in sentence."),
  items: z.array(askChecklistItemSchema).min(1).max(10).describe("1–10 ordered steps."),
});
export type AskChecklist = z.infer<typeof askChecklistSchema>;

// ── Timeline ──────────────────────────────────────────────────────────────────
export const askTimelineItemSchema = z.object({
  title: z.string().describe("Event / milestone name."),
  timeframe: z.string().optional().describe("When, e.g. 'Week 1', 'Q3', '3 commits ago'."),
  detail: z.string().optional().describe("Optional one-line description."),
});

export const askTimelineSchema = z.object({
  title: z.string().describe("Timeline heading."),
  items: z.array(askTimelineItemSchema).min(1).max(10).describe("1–10 chronological entries."),
});
export type AskTimeline = z.infer<typeof askTimelineSchema>;

// ── Comparison table ──────────────────────────────────────────────────────────
export const askComparisonSchema = z.object({
  title: z.string().describe("Table heading."),
  columns: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("2–4 column headers (first is the row label column)."),
  rows: z
    .array(
      z.object({
        label: z.string().describe("Row label (leftmost cell)."),
        cells: z.array(z.string()).describe("One cell per non-label column, in column order."),
      }),
    )
    .min(1)
    .max(10),
});
export type AskComparison = z.infer<typeof askComparisonSchema>;

// ── Expert / who-to-ask (bus factor) ──────────────────────────────────────────
export const askExpertSchema = z.object({
  name: z.string().describe("Person or contributor to route the question to."),
  role: z.string().optional().describe("Their role or team, if known."),
  reason: z.string().describe("Why them — one sentence grounded in the evidence."),
  evidence: z.array(z.string()).max(5).optional().describe("Up to 5 short evidence bullets."),
  draftMessage: z.string().optional().describe("A ready-to-send draft the user can copy."),
  busFactorRisk: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Concentration risk if this person is the sole owner."),
});
export type AskExpert = z.infer<typeof askExpertSchema>;

// ── Callout (info / escalate-to-human) ────────────────────────────────────────
export const askCalloutSchema = z.object({
  intent: z
    .enum(["info", "success", "warning", "danger", "escalate"])
    .describe("escalate = low confidence / not enough context, recommend asking a human."),
  title: z.string().describe("Short callout headline."),
  body: z.string().describe("One or two sentences."),
});
export type AskCallout = z.infer<typeof askCalloutSchema>;

// ── Code snippet (grounded in retrieved code) ─────────────────────────────────
export const askCodeSnippetSchema = z.object({
  title: z.string().optional().describe("Optional heading above the snippet."),
  filePath: z
    .string()
    .optional()
    .describe("Repo-relative path this code is from, e.g. 'backend/onboard/main.py'."),
  language: z
    .string()
    .optional()
    .describe("Language hint for the label, e.g. 'ts', 'python', 'bash'."),
  code: z
    .string()
    .describe(
      "The code to show, verbatim from the retrieved context. Keep it focused (≤40 lines).",
    ),
  caption: z.string().optional().describe("One-line explanation of what this code does."),
});
export type AskCodeSnippet = z.infer<typeof askCodeSnippetSchema>;

// ── File tree (where the code lives) ───────────────────────────────────────────
export const askFileTreeSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  root: z.string().optional().describe("Optional root label, e.g. the repo or module name."),
  paths: z
    .array(
      z.object({
        path: z
          .string()
          .describe(
            "Repo-relative, '/'-separated path. End folders with '/', e.g. 'backend/onboard/api/'.",
          ),
        note: z.string().optional().describe("Short note on what lives here."),
      }),
    )
    .min(1)
    .max(24)
    .describe("Real paths from the retrieved code/context that map out the relevant area."),
});
export type AskFileTree = z.infer<typeof askFileTreeSchema>;

// ── Commands (copyable setup / terminal) ──────────────────────────────────────
export const askCommandsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Run it locally'."),
  intro: z.string().optional().describe("Optional lead-in sentence."),
  commands: z
    .array(
      z.object({
        command: z.string().describe("The exact shell command to run."),
        description: z.string().optional().describe("What this command does."),
      }),
    )
    .min(1)
    .max(10)
    .describe(
      "1–10 commands in run order. Only use commands grounded in the project's docs/config.",
    ),
});
export type AskCommands = z.infer<typeof askCommandsSchema>;

// ── People / contributors roster (multiple; vs the single showExpert) ──────────
export const askPeopleSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Who works on this'."),
  people: z
    .array(
      z.object({
        name: z.string().describe("Contributor name."),
        role: z.string().optional().describe("Role or team, if known."),
        focus: z.string().optional().describe("Area they own or mostly work on."),
        stat: z
          .string()
          .optional()
          .describe("Short activity stat, e.g. '42 commits', 'owns 3 modules'."),
      }),
    )
    .min(1)
    .max(8)
    .describe("2–8 contributors. Use showExpert instead when routing to ONE person to ask."),
});
export type AskPeople = z.infer<typeof askPeopleSchema>;

// ── FAQ accordion ─────────────────────────────────────────────────────────────
export const askFaqSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Common questions'."),
  items: z
    .array(
      z.object({
        question: z.string().describe("The question, phrased as a new hire would ask it."),
        answer: z.string().describe("A concise grounded answer."),
      }),
    )
    .min(1)
    .max(8)
    .describe("1–8 question/answer pairs."),
});
export type AskFaq = z.infer<typeof askFaqSchema>;

// ── Key/value fact sheet (project spec: stack, ports, entrypoints…) ────────────
export const askKeyValueSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Project at a glance'."),
  items: z
    .array(
      z.object({
        label: z
          .string()
          .describe("The fact's name, e.g. 'Backend', 'Local URL', 'Package manager'."),
        value: z.string().describe("The fact's value as display text."),
        href: z.string().optional().describe("Optional URL — renders the value as a link."),
      }),
    )
    .min(1)
    .max(12)
    .describe("2–12 facts. Non-numeric project details (use showMetrics for numeric KPIs)."),
});
export type AskKeyValue = z.infer<typeof askKeyValueSchema>;

// ── Quiz (interactive knowledge check) ─────────────────────────────────────────
export const askQuizSchema = z.object({
  question: z.string().describe("A single knowledge-check question about the project."),
  options: z.array(z.string()).min(2).max(5).describe("2–5 answer options."),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .describe("0-based index of the correct option in `options`."),
  explanation: z
    .string()
    .optional()
    .describe("Shown after answering — why the correct answer is right."),
});
export type AskQuiz = z.infer<typeof askQuizSchema>;

// ── Tabs (switchable content panels) ───────────────────────────────────────────
export const askTabsSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  tabs: z
    .array(
      z.object({
        label: z.string().describe("Short tab label, e.g. 'Backend', 'Frontend'."),
        body: z.string().describe("This tab's content as plain text (newlines allowed)."),
      }),
    )
    .min(2)
    .max(5)
    .describe("2–5 tabs. Good for splitting an answer by area/layer/option."),
});
export type AskTabs = z.infer<typeof askTabsSchema>;

// ── Flashcards (flip to reveal; learning) ──────────────────────────────────────
export const askFlashcardsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Key concepts'."),
  cards: z
    .array(
      z.object({
        front: z.string().describe("Term or question shown on the card front."),
        back: z.string().describe("Definition or answer revealed when flipped."),
      }),
    )
    .min(1)
    .max(10)
    .describe("1–10 term/definition cards for concepts a new hire should learn."),
});
export type AskFlashcards = z.infer<typeof askFlashcardsSchema>;

// ── Resources (grid of openable docs / links) ──────────────────────────────────
export const askResourcesSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Read these first'."),
  resources: z
    .array(
      z.object({
        label: z.string().describe("Resource title."),
        description: z.string().optional().describe("One-line reason to open it."),
        documentId: z
          .string()
          .optional()
          .describe("EXACT document_id from context — makes the card open the doc in-app."),
        href: z
          .string()
          .optional()
          .describe("External URL, if this is a link (not a project doc)."),
        kind: z.enum(["doc", "code", "link"]).optional().describe("Icon hint."),
      }),
    )
    .min(1)
    .max(8)
    .describe("1–8 resource cards. Prefer real project docs (with documentId) so they open."),
});
export type AskResources = z.infer<typeof askResourcesSchema>;

/** The tool name → input-schema registry. Keys are the tool names the model calls. */
export const ASK_TOOL_SCHEMAS = {
  showMetrics: askMetricsSchema,
  showChart: askChartSchema,
  showCitations: askCitationsSchema,
  showChecklist: askChecklistSchema,
  showTimeline: askTimelineSchema,
  showComparison: askComparisonSchema,
  showExpert: askExpertSchema,
  showCallout: askCalloutSchema,
  showCodeSnippet: askCodeSnippetSchema,
  showFileTree: askFileTreeSchema,
  showCommands: askCommandsSchema,
  showPeople: askPeopleSchema,
  showFaq: askFaqSchema,
  showKeyValue: askKeyValueSchema,
  showQuiz: askQuizSchema,
  showTabs: askTabsSchema,
  showFlashcards: askFlashcardsSchema,
  showResources: askResourcesSchema,
  showSteps: askStepsSchema,
  showTable: askTableSchema,
  showProgress: askProgressSchema,
  showRating: askRatingSchema,
  showGlossary: askGlossarySchema,
  showBadges: askBadgesSchema,
  showAccordion: askAccordionSchema,
  showQuote: askQuoteSchema,
  showActions: askActionsSchema,
  showKeyTakeaways: askKeyTakeawaysSchema,
  showTree: askTreeSchema,
  showFlow: askFlowSchema,
  showApiEndpoint: askApiEndpointSchema,
  showAnnotatedCode: askAnnotatedCodeSchema,
  showDiff: askDiffSchema,
  showEnvVars: askEnvVarsSchema,
  showDecisionTree: askDecisionTreeSchema,
  showConfidenceCheck: askConfidenceCheckSchema,
  showProsCons: askProsConsSchema,
} as const;

export type AskToolName = keyof typeof ASK_TOOL_SCHEMAS;
