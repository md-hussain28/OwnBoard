import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries";
import { ID_PREFIXES, isDraftId, typedId } from "@/lib";
import type { DocPack, DocPackListItem, QuizQuestionCurationItem } from "@/schemas";
import { docPackService } from "@/services";
import { useUploadStore } from "@/stores";
import { docPackKeys } from "./doc-pack.queries";

/** Project a full pack into the leaner list-item shape held in the `all` cache. */
function toListItem(pack: DocPack): DocPackListItem {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    status: pack.status,
    createdBy: pack.createdBy,
    createdAt: pack.createdAt,
    domainId: pack.domainId,
    domainName: pack.domainName,
    assignToAll: pack.assignToAll,
    audienceDomainIds: pack.audienceDomainIds,
    audienceDomainNames: pack.audienceDomainNames,
    sequenceOrder: pack.sequenceOrder,
    estimatedMinutes: pack.estimatedMinutes,
    dueOffsetDays: pack.dueOffsetDays,
    passPct: pack.passPct,
  };
}

type CreateDocPackInput = {
  name: string;
  description?: string;
  domain_id?: string | null;
  assign_to_all?: boolean;
  audience_domain_ids?: string[];
  sequence_order?: number;
  estimated_minutes?: number | null;
  due_offset_days?: number | null;
};

/** A placeholder list row shown instantly on create; replaced by the server pack on success. */
function optimisticDocPack(input: CreateDocPackInput): DocPackListItem {
  return {
    id: typedId(ID_PREFIXES.draft),
    name: input.name,
    description: input.description ?? null,
    status: "draft",
    createdBy: null,
    createdAt: new Date().toISOString(),
    domainId: input.domain_id ?? null,
    domainName: null,
    assignToAll: input.assign_to_all ?? false,
    audienceDomainIds: input.audience_domain_ids ?? [],
    audienceDomainNames: [],
    sequenceOrder: input.sequence_order ?? 0,
    estimatedMinutes: input.estimated_minutes ?? null,
    dueOffsetDays: input.due_offset_days ?? null,
    passPct: 100,
  };
}

export function useCreateDocPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocPackInput) => docPackService.create(input),
    onMutate: async (input) => {
      const snap = await optimisticUpdate<DocPackListItem[]>(
        queryClient,
        docPackKeys.all,
        (prev) => (prev ? [optimisticDocPack(input), ...prev] : prev),
      );
      return { snap };
    },
    onError: (_err, _input, context) => {
      rollbackOptimistic(queryClient, docPackKeys.all, context?.snap);
    },
    onSuccess: (pack) => {
      queryClient.setQueryData(docPackKeys.detail(pack.id), pack);
      queryClient.setQueryData<DocPackListItem[]>(docPackKeys.all, (prev) => {
        const item = toListItem(pack);
        // Drop the temp draft row(s) and any stale copy, then prepend the real pack.
        const rest = prev?.filter((p) => p.id !== pack.id && !isDraftId(p.id)) ?? [];
        return [item, ...rest];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.all });
    },
  });
}

type UpdateDocPackInput = {
  name?: string;
  description?: string;
  domain_id?: string | null;
  assign_to_all?: boolean;
  audience_domain_ids?: string[];
  sequence_order?: number;
  estimated_minutes?: number | null;
  due_offset_days?: number | null;
};

/** Fields of a cached pack an update payload touches — undefined input fields keep their current value. */
function docPackPatch(
  current: Pick<DocPack, "name" | "description" | "domainId" | "assignToAll">,
  input: UpdateDocPackInput,
): Pick<DocPack, "name" | "description" | "domainId" | "assignToAll"> {
  return {
    name: input.name ?? current.name,
    description:
      input.description !== undefined ? (input.description ?? null) : current.description,
    domainId: input.domain_id !== undefined ? input.domain_id : current.domainId,
    assignToAll: input.assign_to_all !== undefined ? input.assign_to_all : current.assignToAll,
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
        prev?.map((p) => (p.id === packId ? toListItem(pack) : p)),
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
    mutationFn: (input: {
      questions: QuizQuestionCurationItem[];
      openBook: boolean;
      passPct?: number;
    }) => docPackService.saveQuiz(packId, input.questions, input.openBook, input.passPct ?? 100),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: docPackKeys.quiz(packId) });
      void queryClient.invalidateQueries({ queryKey: docPackKeys.detail(packId) });
    },
  });
}

/**
 * Dry-run preview of how many employees an audience selection resolves to.
 * A POST mutation (not a query) since it has no stable cache identity — call `mutateAsync`
 * with `{ assign_to_all, audience_domain_ids }` and read `{ count, sampleNames }` from the result.
 */
export function useAudiencePreview() {
  return useMutation({
    mutationFn: (input: { assign_to_all: boolean; audience_domain_ids: string[] }) =>
      docPackService.audiencePreview(input),
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
