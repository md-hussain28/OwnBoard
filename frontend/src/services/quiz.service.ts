import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { quizAttemptSchema, type QuizAttempt } from "@/schemas/quiz.schema";

export const quizService = {
  /** Grade a completed attempt — reused across policy/codebase/doc_pack quizzes (PRD §9 path fix). */
  async gradeAttempt(input: {
    attemptId: string;
    answers: Record<string, string>;
  }): Promise<QuizAttempt> {
    const { data } = await getApiClient().post(API_ENDPOINTS.gradeAttempt(input.attemptId), {
      answers: input.answers,
    });
    return quizAttemptSchema.parse(data);
  },
};
