import type { QuestionFormat } from "@/schemas/quiz.schema";

export type { QuestionFormat } from "@/schemas/quiz.schema";

/** Formats the AI generator can produce (multi_select is manual-authoring only). */
export type GenerateFormat = "mcq_4" | "true_false";

export interface EditableQuestion {
  id: string;
  questionText: string;
  options: string[];
  format: QuestionFormat | null;
  /** Correct option text for mcq_4 / true_false. */
  correctAnswer: string;
  /** Correct option texts for multi_select (set-match). */
  correctAnswers: string[];
  sourceCitation: string | null;
  dropped: boolean;
  /** True for a question the admin authored by hand that isn't on the server yet. */
  isNew?: boolean;
}

export const FORMAT_LABEL: Record<QuestionFormat, string> = {
  mcq_4: "Multiple choice",
  true_false: "True / False",
  multi_select: "Select all that apply",
};
