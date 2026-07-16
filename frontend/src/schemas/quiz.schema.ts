import { z } from "zod";

/**
 * Mirrors the backend's QuizQuestionResponse (question_text/source_citation — PRD §9 contract fix).
 * The employee-facing shape never includes the correct answer.
 */
export const quizQuestionSchema = z
  .object({
    id: z.string(),
    question_text: z.string(),
    options: z.array(z.string()).nullable(),
    format: z.enum(["mcq_4", "true_false"]).nullable().optional(),
    source_citation: z.string().nullable().optional(),
  })
  .transform((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: q.options ?? [],
    format: q.format ?? null,
    sourceCitation: q.source_citation ?? null,
  }));

/** Admin/curation view — includes the correct answer for editing. */
export const adminQuizQuestionSchema = z
  .object({
    id: z.string(),
    question_text: z.string(),
    options: z.array(z.string()).nullable(),
    format: z.enum(["mcq_4", "true_false"]).nullable().optional(),
    source_citation: z.string().nullable().optional(),
    correct_answer: z.string(),
  })
  .transform((q) => ({
    id: q.id,
    questionText: q.question_text,
    options: q.options ?? [],
    format: q.format ?? null,
    sourceCitation: q.source_citation ?? null,
    correctAnswer: q.correct_answer,
  }));

export const quizTemplateSchema = z
  .object({
    id: z.string(),
    type: z.enum(["policy", "codebase", "doc_pack"]),
    source_ref: z.string(),
    custom_instructions: z.string().nullable(),
    is_published: z.boolean(),
    questions: z.array(quizQuestionSchema).default([]),
  })
  .transform((t) => ({
    id: t.id,
    type: t.type,
    sourceRef: t.source_ref,
    customInstructions: t.custom_instructions,
    isPublished: t.is_published,
    questions: t.questions,
  }));

export const adminQuizTemplateSchema = z
  .object({
    id: z.string(),
    type: z.enum(["policy", "codebase", "doc_pack"]),
    source_ref: z.string(),
    custom_instructions: z.string().nullable(),
    is_published: z.boolean(),
    questions: z.array(adminQuizQuestionSchema).default([]),
  })
  .transform((t) => ({
    id: t.id,
    type: t.type,
    sourceRef: t.source_ref,
    customInstructions: t.custom_instructions,
    isPublished: t.is_published,
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
export type GenerateDocPackQuizResponse = z.infer<typeof generateDocPackQuizResponseSchema>;

/** One kept/edited question in a curation save (backend QuizQuestionCurationItem). */
export type QuizQuestionCurationItem = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  format?: "mcq_4" | "true_false" | null;
  source_citation?: string | null;
};
