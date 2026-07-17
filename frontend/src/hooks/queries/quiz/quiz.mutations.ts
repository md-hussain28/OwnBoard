import { useMutation, useQueryClient } from "@tanstack/react-query";
import { packAssignmentKeys } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { quizService } from "@/services/quiz.service";

export function useGradeAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { attemptId: string; answers: Record<string, string | string[]> }) =>
      quizService.gradeAttempt(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: packAssignmentKeys.all });
    },
  });
}
