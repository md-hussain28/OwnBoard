import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries/optimistic";
import { projectKeys } from "@/hooks/queries/project/project.queries";
import type { ProjectDocs } from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

// ---- docs (knowledge base) ------------------------------------------------

function useInvalidateDocs(id: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.docs(id) });
}

export function useUploadProjectDocs(id: string) {
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (files: File[]) => projectService.uploadDocs(id, files),
    onSuccess: invalidate,
  });
}

export function useDeleteProjectDoc(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (documentId: string) => projectService.deleteDoc(id, documentId),
    onMutate: (documentId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) =>
          prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== documentId) } : prev,
        ),
      ]),
    onError: (_err, _documentId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useSetDocTypes(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (vars: { documentId: string; typeIds: string[] }) =>
      projectService.setDocTypes(id, vars.documentId, vars.typeIds),
    onMutate: (vars) => {
      const docs = queryClient.getQueryData<ProjectDocs>(projectKeys.docs(id));
      const typeNames = vars.typeIds
        .map((tid) => docs?.types.find((t) => t.id === tid)?.name)
        .filter((n): n is string => Boolean(n));
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) =>
          prev
            ? {
                ...prev,
                documents: prev.documents.map((d) =>
                  d.id === vars.documentId ? { ...d, typeIds: vars.typeIds, typeNames } : d,
                ),
              }
            : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useCreateDocType(id: string) {
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (name: string) => projectService.createDocType(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteDocType(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (typeId: string) => projectService.deleteDocType(id, typeId),
    onMutate: (typeId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            types: prev.types.filter((t) => t.id !== typeId),
            documents: prev.documents.map((d) => {
              const idx = d.typeIds.indexOf(typeId);
              if (idx === -1) return d;
              return {
                ...d,
                typeIds: d.typeIds.filter((x) => x !== typeId),
                typeNames: d.typeNames.filter((_, i) => i !== idx),
              };
            }),
          };
        }),
      ]),
    onError: (_err, _typeId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}
