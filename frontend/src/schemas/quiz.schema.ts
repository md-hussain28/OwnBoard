import { z } from "zod";

export const questionFormatSchema = z.enum(["mcq_4", "true_false", "multi_select"]);
export type QuestionFormat = z.infer<typeof questionFormatSchema>;

/** Parse a stored multi_select correct answer (JSON array of option texts) defensively. */
export function parseMultiSelectAnswer(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Mirrors the backend's QuizQuestionResponse (question_text/source_citation — PRD §9 contract fix).
 * The employee-facing shape never includes the correct answer.
 */
export const quizQuestionSchema = z
  .object({
    id: z.string(),
    question_text: z.string(),
    options: z.array(z.string()).nullable(),
    format: questionFormatSchema.nullable().optional(),
    source_citation: z.string().nullable().optional(),
  })
  .transform((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: q.options ?? [],
    format: q.format ?? null,
    sourceCitation: q.source_citation ?? null,
  }));

/**
 * Admin/curation view — includes the correct answer for editing. `correctAnswer` is a `string[]`
 * for multi_select (parsed from the stored JSON) and a single `string` for other formats.
 */
export const adminQuizQuestionSchema = z
  .object({
    id: z.string(),
    question_text: z.string(),
    options: z.array(z.string()).nullable(),
    format: questionFormatSchema.nullable().optional(),
    source_citation: z.string().nullable().optional(),
    correct_answer: z.string(),
  })
  .transform((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: q.options ?? [],
    format: q.format ?? null,
    sourceCitation: q.source_citation ?? null,
    correctAnswer:
      q.format === "multi_select"
        ? (parseMultiSelectAnswer(q.correct_answer) as string | string[])
        : q.correct_answer,
  }));

export const quizTemplateSchema = z
  .object({
    id: z.string(),
    type: z.enum(["policy", "codebase", "doc_pack"]),
    source_ref: z.string(),
    custom_instructions: z.string().nullable(),
    is_published: z.boolean(),
    open_book: z.boolean().optional().default(false),
    questions: z.array(quizQuestionSchema).default([]),
  })
  .transform((t) => ({
    id: t.id,
    type: t.type,
    sourceRef: t.source_ref,
    customInstructions: t.custom_instructions,
    isPublished: t.is_published,
    openBook: t.open_book,
    questions: t.questions,
  }));

export const adminQuizTemplateSchema = z
  .object({
    id: z.string(),
    type: z.enum(["policy", "codebase", "doc_pack"]),
    source_ref: z.string(),
    custom_instructions: z.string().nullable(),
    is_published: z.boolean(),
    open_book: z.boolean().optional().default(false),
    questions: z.array(adminQuizQuestionSchema).default([]),
  })
  .transform((t) => ({
    id: t.id,
    type: t.type,
    sourceRef: t.source_ref,
    customInstructions: t.custom_instructions,
    isPublished: t.is_published,
    openBook: t.open_book,
    questions: t.questions,
  }));

export const quizAttemptSchema = z
  .object({
    id: z.string(),
    employee_id: z.string(),
    quiz_template_id: z.string(),
    score: z.number().nullable(),
    passed: z.boolean().nullable(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
  })
  .transform((a) => ({
    id: a.id,
    employeeId: a.employee_id,
    quizTemplateId: a.quiz_template_id,
    score: a.score,
    passed: a.passed,
    startedAt: a.started_at,
    completedAt: a.completed_at,
  }));

/**
 * Response of `POST /quizzes/attempts/{id}/grade` — the graded attempt plus a per-question
 * breakdown. Supersedes the old shape which returned just the attempt object.
 */
export const gradeAttemptResultSchema = z
  .object({
    attempt: quizAttemptSchema,
    score: z.number(),
    passed: z.boolean(),
    pass_pct: z.number(),
    correct_count: z.number(),
    total_count: z.number(),
    results: z
      .array(
        z.object({
          question_id: z.string(),
          question_text: z.string(),
          correct: z.boolean(),
          source_citation: z.string().nullable(),
        }),
      )
      .default([]),
  })
  .transform((r) => ({
    attempt: r.attempt,
    score: r.score,
    passed: r.passed,
    passPct: r.pass_pct,
    correctCount: r.correct_count,
    totalCount: r.total_count,
    results: r.results.map((q) => ({
      questionId: q.question_id,
      questionText: q.question_text,
      correct: q.correct,
      sourceCitation: q.source_citation,
    })),
  }));

export const generateDocPackQuizResponseSchema = z
  .object({
    template: adminQuizTemplateSchema,
    rejected_slots: z
      .array(
        z.object({
          document_title: z.string(),
          citation: z.string(),
          reason: z.string(),
        }),
      )
      .default([]),
    needs_review: z.boolean().default(false),
  })
  .transform((r) => ({
    template: r.template,
    rejectedSlots: r.rejected_slots.map((s) => ({
      documentTitle: s.document_title,
      citation: s.citation,
      reason: s.reason,
    })),
    needsReview: r.needs_review,
  }));

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type AdminQuizQuestion = z.infer<typeof adminQuizQuestionSchema>;
export type QuizTemplate = z.infer<typeof quizTemplateSchema>;
export type AdminQuizTemplate = z.infer<typeof adminQuizTemplateSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type GradeAttemptResult = z.infer<typeof gradeAttemptResultSchema>;
export type GenerateDocPackQuizResponse = z.infer<typeof generateDocPackQuizResponseSchema>;

/** One kept/edited/added question in a curation save (backend QuizQuestionCurationItem).
 * `correct_answer` is a string[] for multi_select, a single string otherwise. An `id` the backend
 * doesn't recognise (e.g. a client temp id) is treated as a manually authored new question. */
export type QuizQuestionCurationItem = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string | string[];
  format?: QuestionFormat | null;
  source_citation?: string | null;
};
