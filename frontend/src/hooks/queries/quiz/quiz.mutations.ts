import { useMutation } from "@tanstack/react-query";
import { quizService } from "@/services/quiz.service";

export function useGradeAttempt() {
  return useMutation({
    mutationFn: (input: { attemptId: string; answers: Record<string, string> }) =>
      quizService.gradeAttempt(input),
  });
}
