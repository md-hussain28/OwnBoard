import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quizDomainService } from "@/services/quiz-domain.service";
import type { CreateQuizDomainInput } from "@/schemas/quiz-domain.schema";
import { docPackKeys } from "@/hooks/queries/doc-pack/doc-pack.queries";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizDomainKeys.all });
    },
  });
}

export function useDeleteQuizDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quizDomainService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizDomainKeys.all });
      queryClient.invalidateQueries({ queryKey: docPackKeys.all });
    },
  });
}
