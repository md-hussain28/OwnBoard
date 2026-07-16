import { useMutation, useQueryClient } from "@tanstack/react-query";
import { docPackService } from "@/services/doc-pack.service";
import type { QuizQuestionCurationItem } from "@/schemas/quiz.schema";
import { docPackKeys } from "@/hooks/queries/doc-pack/doc-pack.queries";

export function useCreateDocPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => docPackService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docPackKeys.all }),
  });
}

export function useUploadDocuments(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => docPackService.uploadDocuments(packId, files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) }),
  });
}

export function useDeleteDocument(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => docPackService.deleteDocument(packId, documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) }),
  });
}

export function useGenerateQuiz(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      target_count: number;
      formats: ("mcq_4" | "true_false")[];
      custom_instructions?: string;
    }) => docPackService.generateQuiz(packId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
      queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
  });
}

export function useSaveQuiz(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questions: QuizQuestionCurationItem[]) => docPackService.saveQuiz(packId, questions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
      queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
  });
}

export function useRegenerateQuestions(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionIds: string[]) => docPackService.regenerateQuestions(packId, questionIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) }),
  });
}
