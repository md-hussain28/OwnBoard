import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { docPackService } from "@/services/doc-pack.service";
import type { QuizQuestionCurationItem } from "@/schemas/quiz.schema";
import { docPackKeys } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useUploadStore } from "@/stores/upload-store";

export function useCreateDocPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) => docPackService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: docPackKeys.all }),
  });
}

/**
 * Fire-and-forget upload tracked in the global upload store (progress widget).
 * Returns `start(files)` which validates the batch and returns an error message, or null
 * when the upload was queued. The upload keeps running if the caller unmounts.
 */
export function useBackgroundUpload(packId: string, packName: string) {
  const queryClient = useQueryClient();
  const validateFiles = useUploadStore((s) => s.validateFiles);
  const startUpload = useUploadStore((s) => s.startUpload);

  return useCallback(
    (files: File[]): string | null => {
      const validationError = validateFiles(files);
      if (validationError) return validationError;
      startUpload({
        packId,
        packName,
        files,
        onUploaded: () => {
          // New rows exist — refresh the pack and restart the ingest-status poll.
          void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
          void queryClient.invalidateQueries({ queryKey: docPackKeys.ingestStatus(packId) });
        },
      });
      return null;
    },
    [packId, packName, queryClient, startUpload, validateFiles],
  );
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
