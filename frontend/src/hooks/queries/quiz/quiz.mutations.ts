import { useMutation } from "@tanstack/react-query";
import { quizService } from "@/services/quiz.service";

export function useSubmitQuizAttempt() {
  return useMutation({
    mutationFn: (input: { quizTemplateId: string; employeeId: string; answers: number[] }) =>
      quizService.submitAttempt(input),
  });
}
