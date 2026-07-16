import { z } from "zod";

export const quizQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(z.string()),
  correctOptionIndex: z.number().optional(),
  citation: z.string().optional(),
});

export const quizTemplateSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  kind: z.enum(["policy", "codebase"]),
  questions: z.array(quizQuestionSchema),
});

export const quizAttemptSchema = z.object({
  id: z.string(),
  quizTemplateId: z.string(),
  employeeId: z.string(),
  answers: z.array(z.number()),
  score: z.number().optional(),
  passed: z.boolean().optional(),
});

export const quizTemplateListSchema = z.array(quizTemplateSchema);

export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizTemplate = z.infer<typeof quizTemplateSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
