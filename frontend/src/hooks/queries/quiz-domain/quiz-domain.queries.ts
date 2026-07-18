import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries";
import { docPackKeys } from "@/hooks/queries/doc-pack";
import type { CreateQuizDomainInput, QuizDomain } from "@/schemas";
import { quizDomainService } from "@/services";

export const quizDomainKeys = {
  all: ["quiz-domains"] as const,
};

export function useQuizDomains(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quizDomainKeys.all,
    queryFn: quizDomainService.list,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateQuizDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuizDomainInput) => quizDomainService.create(input),
    onSuccess: (domain) => {
      queryClient.setQueryData<QuizDomain[]>(quizDomainKeys.all, (prev) =>
        prev ? [...prev, domain] : [domain],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: quizDomainKeys.all });
    },
  });
}

export function useDeleteQuizDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quizDomainService.remove(id),
    onMutate: async (id) => {
      const snapshot = await optimisticUpdate<QuizDomain[]>(
        queryClient,
        quizDomainKeys.all,
        (prev) => prev?.filter((d) => d.id !== id),
      );
      return snapshot;
    },
    onError: (_err, _id, context) => {
      rollbackOptimistic(queryClient, quizDomainKeys.all, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: quizDomainKeys.all });
      void queryClient.invalidateQueries({ queryKey: docPackKeys.all });
    },
  });
}
