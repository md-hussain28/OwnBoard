import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { docPackKeys } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries/optimistic";
import type { DocPack, DocPackListItem } from "@/schemas/docPack.schema";
import type { QuizQuestionCurationItem } from "@/schemas/quiz.schema";
import { docPackService } from "@/services/doc-pack.service";
import { useUploadStore } from "@/stores/upload-store";

export function useCreateDocPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; domain_id?: string | null }) =>
      docPackService.create(input),
    onSuccess: (pack) => {
      queryClient.setQueryData(docPackKeys.detail(pack.id), pack);
      queryClient.setQueryData<DocPackListItem[]>(docPackKeys.all, (prev) => {
        const item: DocPackListItem = {
          id: pack.id,
          name: pack.name,
          description: pack.description,
          status: pack.status,
          createdBy: pack.createdBy,
          createdAt: pack.createdAt,
          domainId: pack.domainId,
          domainName: pack.domainName,
        };
        return prev ? [item, ...prev.filter((p) => p.id !== pack.id)] : [item];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.all });
    },
  });
}

type UpdateDocPackInput = { name?: string; description?: string; domain_id?: string | null };

/** Fields of a cached pack an update payload touches — undefined input fields keep their current value. */
function docPackPatch(
  current: Pick<DocPack, "name" | "description" | "domainId">,
  input: UpdateDocPackInput,
): Pick<DocPack, "name" | "description" | "domainId"> {
  return {
    name: input.name ?? current.name,
    description:
      input.description !== undefined ? (input.description ?? null) : current.description,
    domainId: input.domain_id !== undefined ? input.domain_id : current.domainId,
  };
}

export function useUpdateDocPack(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDocPackInput) => docPackService.update(packId, input),
    onMutate: async (input) => {
      const detailSnap = await optimisticUpdate<DocPack>(
        queryClient,
        docPackKeys.detail(packId),
        (prev) => (prev ? { ...prev, ...docPackPatch(prev, input) } : prev),
      );
      const listSnap = await optimisticUpdate<DocPackListItem[]>(
        queryClient,
        docPackKeys.all,
        (prev) => prev?.map((p) => (p.id === packId ? { ...p, ...docPackPatch(p, input) } : p)),
      );
      return { detailSnap, listSnap };
    },
    onError: (_err, _input, context) => {
      rollbackOptimistic(queryClient, docPackKeys.detail(packId), context?.detailSnap);
      rollbackOptimistic(queryClient, docPackKeys.all, context?.listSnap);
    },
    onSuccess: (pack) => {
      queryClient.setQueryData(docPackKeys.detail(packId), pack);
      queryClient.setQueryData<DocPackListItem[]>(docPackKeys.all, (prev) =>
        prev?.map((p) =>
          p.id === packId
            ? {
                id: pack.id,
                name: pack.name,
                description: pack.description,
                status: pack.status,
                createdBy: pack.createdBy,
                createdAt: pack.createdAt,
                domainId: pack.domainId,
                domainName: pack.domainName,
              }
            : p,
        ),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.all });
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
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
    onMutate: async (documentId) => {
      const snapshot = await optimisticUpdate<DocPack>(
        queryClient,
        docPackKeys.detail(packId),
        (prev) =>
          prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== documentId) } : prev,
      );
      return snapshot;
    },
    onError: (_err, _id, context) => {
      rollbackOptimistic(queryClient, docPackKeys.detail(packId), context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
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
      void queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
  });
}

export function useSaveQuiz(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { questions: QuizQuestionCurationItem[]; openBook: boolean }) =>
      docPackService.saveQuiz(packId, input.questions, input.openBook),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
  });
}

export function useRegenerateQuestions(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionIds: string[]) => docPackService.regenerateQuestions(packId, questionIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
    },
  });
}
