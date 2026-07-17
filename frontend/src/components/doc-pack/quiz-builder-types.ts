export type QuestionFormat = "mcq_4" | "true_false";

export interface EditableQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  format: QuestionFormat | null;
  sourceCitation: string | null;
  dropped: boolean;
}
