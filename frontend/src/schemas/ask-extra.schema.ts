import { z } from "zod";

/**
 * Additional generative-UI component contracts for "Ask project" (part 2 of the catalog).
 * Split out of `ask.schema.ts` to keep each file under the line budget; the tool registry in
 * `ask.schema.ts` imports these. Same rules apply: each `.describe()` is the model's only spec.
 */

// ── Steps (interactive how-it-works walkthrough) ───────────────────────────────
export const askStepsSchema = z.object({
  title: z
    .string()
    .optional()
    .describe("Optional heading, e.g. 'How a request flows through auth'."),
  intro: z.string().optional().describe("Optional lead-in sentence."),
  steps: z
    .array(
      z.object({
        title: z.string().describe("Short step name / what happens at this step."),
        detail: z.string().optional().describe("One or two sentences explaining the step."),
        code: z
          .string()
          .optional()
          .describe(
            "Optional short code excerpt for this step (≤20 lines), verbatim from context.",
          ),
        language: z
          .string()
          .optional()
          .describe("Language hint for the code, e.g. 'ts', 'python'."),
      }),
    )
    .min(2)
    .max(10)
    .describe(
      "2–10 ordered steps for a procedure or how-it-works walkthrough. Use showChecklist for tick-off tasks and showTimeline for dated milestones.",
    ),
});
export type AskSteps = z.infer<typeof askStepsSchema>;

// ── Table (generic, sortable data grid) ────────────────────────────────────────
export const askTableColumnSchema = z.object({
  header: z.string().describe("Column header text."),
  align: z
    .enum(["left", "center", "right"])
    .optional()
    .describe("Cell alignment; use 'right' for numeric columns."),
  numeric: z
    .boolean()
    .optional()
    .describe("Set true for numeric columns so sorting compares numbers, not text."),
});

export const askTableSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  caption: z.string().optional().describe("Optional one-line caption under the table."),
  columns: z
    .array(askTableColumnSchema)
    .min(1)
    .max(6)
    .describe("1–6 column definitions, in order."),
  rows: z
    .array(z.array(z.string()))
    .min(1)
    .max(20)
    .describe(
      "1–20 rows; each row is an array of cell strings in column order (same length as columns). Columns are click-to-sort. Use showComparison for a simple side-by-side of a few options.",
    ),
});
export type AskTable = z.infer<typeof askTableSchema>;

// ── Progress bars (percent complete / coverage) ────────────────────────────────
export const askProgressSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  items: z
    .array(
      z.object({
        label: z.string().describe("What the bar measures, e.g. 'Docs coverage', 'Onboarding'."),
        value: z.number().min(0).max(100).describe("Percent complete, 0–100."),
        caption: z
          .string()
          .optional()
          .describe(
            "Optional text shown on the right, e.g. '18/24 docs'. Defaults to the percentage.",
          ),
        intent: z
          .enum(["neutral", "positive", "warning", "danger"])
          .optional()
          .describe("Bar color intent."),
      }),
    )
    .min(1)
    .max(8)
    .describe(
      "1–8 labeled progress bars for completion/coverage. Use showMetrics for single KPI numbers.",
    ),
});
export type AskProgress = z.infer<typeof askProgressSchema>;

// ── Rating (discrete pips: skill / maturity / confidence levels) ───────────────
export const askRatingSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Skill coverage'."),
  items: z
    .array(
      z.object({
        label: z
          .string()
          .describe("What is being rated — a skill, module maturity, or confidence area."),
        score: z.number().min(0).describe("Filled pips, from 0 up to max."),
        max: z.number().int().min(2).max(10).optional().describe("Total pips (default 5)."),
        caption: z
          .string()
          .optional()
          .describe("Optional short note, e.g. 'Beginner', 'Well documented'."),
      }),
    )
    .min(1)
    .max(8)
    .describe(
      "1–8 discrete pip ratings for levels out of a small max. Use showProgress for percentages.",
    ),
});
export type AskRating = z.infer<typeof askRatingSchema>;

// ── Glossary (searchable term reference) ───────────────────────────────────────
export const askGlossarySchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Project jargon'."),
  terms: z
    .array(
      z.object({
        term: z.string().describe("The term or acronym."),
        definition: z
          .string()
          .describe("A concise plain-language definition grounded in the project."),
        aka: z
          .string()
          .optional()
          .describe("Optional alias / expansion, e.g. what an acronym stands for."),
      }),
    )
    .min(2)
    .max(30)
    .describe(
      "2–30 term/definition entries — a searchable reference for domain jargon. Use showFlashcards for study/flip.",
    ),
});
export type AskGlossary = z.infer<typeof askGlossarySchema>;

// ── Badges (compact pill cluster: tech stack, labels, topics) ──────────────────
export const askBadgesSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Tech stack'."),
  badges: z
    .array(
      z.object({
        label: z.string().describe("Short pill text — a technology, label, or topic."),
        tone: z
          .enum(["neutral", "accent", "info", "success", "warning", "danger"])
          .optional()
          .describe("Color tone; default neutral."),
      }),
    )
    .min(1)
    .max(24)
    .describe("1–24 compact pills for tech stack, labels, topics, or tags."),
});
export type AskBadges = z.infer<typeof askBadgesSchema>;

// ── Accordion (generic collapsible content sections) ───────────────────────────
export const askAccordionSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("Section title shown on the collapsed row."),
        body: z.string().describe("Section content as plain text (newlines allowed)."),
        defaultOpen: z.boolean().optional().describe("Whether this section starts expanded."),
      }),
    )
    .min(1)
    .max(10)
    .describe(
      "1–10 collapsible content sections for a long segmented explanation. Use showFaq for question/answer pairs and showTabs for parallel options.",
    ),
});
export type AskAccordion = z.infer<typeof askAccordionSchema>;

// ── Quote (attributed pull-quote, optionally openable) ─────────────────────────
export const askQuoteSchema = z.object({
  quote: z.string().describe("The quoted passage, verbatim from a doc/commit/PR/person."),
  author: z.string().optional().describe("Who said/wrote it, if known."),
  role: z
    .string()
    .optional()
    .describe("Their role or source context, e.g. 'PRD §6.3', 'commit message'."),
  documentId: z
    .string()
    .optional()
    .describe("EXACT document_id from context — makes the quote open its source doc."),
});
export type AskQuote = z.infer<typeof askQuoteSchema>;

// ── Actions (interactive follow-up question chips) ─────────────────────────────
export const askActionsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Explore next'."),
  actions: z
    .array(
      z.object({
        label: z.string().describe("Short button text the user sees."),
        prompt: z.string().describe("The full follow-up question to ask when this is clicked."),
      }),
    )
    .min(1)
    .max(6)
    .describe(
      "1–6 suggested follow-up questions; clicking one asks it. Good for ending an answer with next steps.",
    ),
});
export type AskActions = z.infer<typeof askActionsSchema>;

// ── Key takeaways (TL;DR highlight list) ───────────────────────────────────────
export const askKeyTakeawaysSchema = z.object({
  title: z.string().optional().describe("Optional heading, defaults to 'Key takeaways'."),
  points: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("1–6 crisp takeaway sentences — the TL;DR of your answer."),
});
export type AskKeyTakeaways = z.infer<typeof askKeyTakeawaysSchema>;

// ── Tree (interactive expand/collapse hierarchy) ───────────────────────────────
// Flat parent-pointer list (not nested) so it stays a simple JSON-schema for tool-calling; the
// renderer rebuilds the hierarchy from `parentId`.
export const askTreeSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  nodes: z
    .array(
      z.object({
        id: z.string().describe("Unique node id (referenced by children's parentId)."),
        parentId: z.string().optional().describe("Parent node's id. Omit for root node(s)."),
        label: z.string().describe("Node label."),
        detail: z.string().optional().describe("Optional one-line note shown after the label."),
        badge: z.string().optional().describe("Optional small tag, e.g. a count or type."),
      }),
    )
    .min(2)
    .max(40)
    .describe(
      "2–40 nodes as a flat list; the tree is built from parentId. Use for concept/dependency/decision/org hierarchies. Use showFileTree for real repo file paths.",
    ),
});
export type AskTree = z.infer<typeof askTreeSchema>;

// ── Flow / graph (interactive node-and-edge diagram) ───────────────────────────
export const askFlowNodeKindSchema = z.enum(["start", "step", "decision", "io", "end"]);
export type AskFlowNodeKind = z.infer<typeof askFlowNodeKindSchema>;

export const askFlowSchema = z.object({
  title: z.string().optional().describe("Optional heading."),
  nodes: z
    .array(
      z.object({
        id: z.string().describe("Unique node id (referenced by edges)."),
        label: z.string().describe("Short node label."),
        detail: z
          .string()
          .optional()
          .describe("Optional explanation shown when the node is focused."),
        kind: askFlowNodeKindSchema
          .optional()
          .describe("start/step/decision/io/end — tints the node and hints its role."),
      }),
    )
    .min(2)
    .max(20)
    .describe("2–20 nodes."),
  edges: z
    .array(
      z.object({
        from: z.string().describe("Source node id."),
        to: z.string().describe("Target node id."),
        label: z
          .string()
          .optional()
          .describe("Optional edge label, e.g. 'yes' / 'no' / 'on error'."),
      }),
    )
    .min(1)
    .max(40)
    .describe(
      "1–40 directed edges. Use for a process/flow/architecture/decision graph. Nodes auto-layer by dependency; clicking a node highlights its connections. Use showSteps for a purely linear procedure.",
    ),
});
export type AskFlow = z.infer<typeof askFlowSchema>;
