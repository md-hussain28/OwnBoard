import { z } from "zod";

/**
 * Additional generative-UI component contracts for "Ask project" (part 3 of the catalog).
 * Split out of `ask.schema.ts` / `ask-extra.schema.ts` to keep each file under the line budget; the
 * tool registry in `ask.schema.ts` imports these. Same rules apply: each `.describe()` is the model's
 * only spec for how to populate the component, so treat them as prompt engineering.
 */

// ── API endpoint reference card (method + path + params + example) ──────────────
export const askApiParamSchema = z.object({
  name: z.string().describe("Parameter or field name."),
  type: z.string().optional().describe("Type hint, e.g. 'string', 'number', 'uuid'."),
  required: z.boolean().optional().describe("Whether the parameter is required."),
  description: z.string().optional().describe("One-line description of the parameter."),
});

export const askApiEndpointSchema = z.object({
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
    .describe("HTTP method — tints the method badge."),
  path: z.string().describe("The route path, e.g. '/api/v1/projects/{id}/members'."),
  title: z.string().optional().describe("Optional short name for the endpoint."),
  description: z.string().optional().describe("One or two sentences on what the endpoint does."),
  auth: z.string().optional().describe("Auth requirement, e.g. 'Bearer token', 'Admin only'."),
  params: z
    .array(askApiParamSchema)
    .max(12)
    .optional()
    .describe("Path/query/body parameters, if any."),
  requestExample: z
    .string()
    .optional()
    .describe("Example request body/command as text (JSON or curl), verbatim from context."),
  responseExample: z
    .string()
    .optional()
    .describe("Example response body as text (usually JSON), verbatim from context."),
});
export type AskApiEndpoint = z.infer<typeof askApiEndpointSchema>;

// ── Annotated code (code with clickable line-range notes) ──────────────────────
export const askAnnotationSchema = z.object({
  line: z.number().int().min(1).describe("1-based line number where this annotation starts."),
  endLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Optional 1-based end line for a multi-line range (defaults to `line`)."),
  label: z.string().optional().describe("Short tag for the annotation, e.g. 'Entry point'."),
  note: z.string().describe("The explanation for this line / range."),
});

export const askAnnotatedCodeSchema = z.object({
  title: z.string().optional().describe("Optional heading above the code."),
  filePath: z.string().optional().describe("Repo-relative path the code is from."),
  language: z.string().optional().describe("Language hint, e.g. 'ts', 'python'."),
  code: z
    .string()
    .describe("The code to annotate, verbatim from context (≤50 lines). Line numbers are 1-based."),
  annotations: z
    .array(askAnnotationSchema)
    .min(1)
    .max(12)
    .describe(
      "1–12 line-anchored explanations. Clicking one highlights its lines — great for a guided code walkthrough.",
    ),
});
export type AskAnnotatedCode = z.infer<typeof askAnnotatedCodeSchema>;

// ── Diff (before → after code change) ───────────────────────────────────────────
export const askDiffLineSchema = z.object({
  kind: z
    .enum(["add", "remove", "context"])
    .describe("add = new line (green), remove = deleted line (red), context = unchanged."),
  text: z.string().describe("The line content, WITHOUT a leading +/-/space marker."),
});

export const askDiffSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'What changed'."),
  filePath: z.string().optional().describe("Repo-relative path the change is in."),
  language: z.string().optional().describe("Language hint for the label."),
  summary: z.string().optional().describe("One-line summary of the change and why it matters."),
  lines: z
    .array(askDiffLineSchema)
    .min(1)
    .max(60)
    .describe("The diff hunk, in order. Keep it focused (≤60 lines). Ground it in real context."),
});
export type AskDiff = z.infer<typeof askDiffSchema>;

// ── Environment / config variables (setup) ─────────────────────────────────────
export const askEnvVarSchema = z.object({
  name: z.string().describe("The variable name, e.g. 'DATABASE_URL', 'OPENAI_API_KEY'."),
  description: z.string().optional().describe("What it configures."),
  required: z.boolean().optional().describe("Whether it must be set for the app to run."),
  secret: z
    .boolean()
    .optional()
    .describe("True for secrets/keys — the example is masked with a reveal toggle."),
  example: z.string().optional().describe("Example / default value, e.g. 'postgresql://…'."),
});

export const askEnvVarsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Environment variables'."),
  intro: z.string().optional().describe("Optional lead-in, e.g. which file these go in."),
  vars: z
    .array(askEnvVarSchema)
    .min(1)
    .max(20)
    .describe("1–20 config variables grounded in the project's env/config docs."),
});
export type AskEnvVars = z.infer<typeof askEnvVarsSchema>;

// ── Decision tree (interactive "choose your path" guide) ───────────────────────
// Flat node list; each option points to the next node id, and terminal nodes carry a recommendation.
export const askDecisionNodeSchema = z.object({
  id: z.string().describe("Unique node id (referenced by options' `next`)."),
  question: z
    .string()
    .optional()
    .describe("The question at this node. Omit on terminal nodes that only give a result."),
  result: z
    .string()
    .optional()
    .describe("The recommendation shown when this node is reached (terminal nodes)."),
  detail: z.string().optional().describe("Optional extra context shown with the result."),
  options: z
    .array(
      z.object({
        label: z.string().describe("The answer choice the user clicks."),
        next: z.string().describe("The id of the node this choice leads to."),
      }),
    )
    .max(5)
    .optional()
    .describe("Answer choices (omit on terminal/result nodes)."),
});

export const askDecisionTreeSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Which approach should I use?'."),
  rootId: z.string().describe("The id of the starting node."),
  nodes: z
    .array(askDecisionNodeSchema)
    .min(2)
    .max(24)
    .describe(
      "2–24 nodes forming a guided decision walkthrough. The user answers step by step and lands on a recommendation. Use showFlow for a non-interactive process graph.",
    ),
});
export type AskDecisionTree = z.infer<typeof askDecisionTreeSchema>;

// ── Confidence check (interactive self-assessment / readiness) ─────────────────
export const askConfidenceCheckSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Rate your readiness'."),
  intro: z
    .string()
    .optional()
    .describe("Optional lead-in explaining the self-check, e.g. 'How confident are you on…'."),
  topics: z
    .array(
      z.object({
        label: z.string().describe("The area / skill the user rates themselves on."),
        hint: z.string().optional().describe("Optional one-line clarification of the area."),
      }),
    )
    .min(2)
    .max(8)
    .describe(
      "2–8 areas the user self-rates (1–5). The component tallies a readiness score and suggests where to focus — a reflective onboarding check-in.",
    ),
});
export type AskConfidenceCheck = z.infer<typeof askConfidenceCheckSchema>;

// ── Pros & cons (decision aid, one or more options) ────────────────────────────
export const askProsConsSchema = z.object({
  title: z.string().optional().describe("Optional heading, e.g. 'Should we adopt X?'."),
  options: z
    .array(
      z.object({
        label: z.string().describe("The option / approach being weighed."),
        pros: z.array(z.string()).max(6).describe("Up to 6 upsides."),
        cons: z.array(z.string()).max(6).describe("Up to 6 downsides."),
        verdict: z.string().optional().describe("Optional one-line takeaway for this option."),
      }),
    )
    .min(1)
    .max(3)
    .describe(
      "1–3 options weighed as pros vs cons. Use showComparison for a feature matrix across many columns.",
    ),
});
export type AskProsCons = z.infer<typeof askProsConsSchema>;
