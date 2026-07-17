import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type GradeAttemptResult, gradeAttemptResultSchema } from "@/schemas/quiz.schema";

export const quizService = {
  /**
   * Grade a completed attempt — reused across policy/codebase/doc_pack quizzes (PRD §9 path fix).
   * Returns the graded attempt plus a per-question breakdown (see `gradeAttemptResultSchema`).
   */
  async gradeAttempt(input: {
    attemptId: string;
    answers: Record<string, string | string[]>;
  }): Promise<GradeAttemptResult> {
    const { data } = await getApiClient().post(API_ENDPOINTS.gradeAttempt(input.attemptId), {
      answers: input.answers,
    });
    return gradeAttemptResultSchema.parse(data);
  },
};
