import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import { ID_PREFIXES, typedId } from "@/lib";
import type { ProjectDocs } from "@/schemas";
import { projectService } from "@/services";
import { projectKeys } from "./project.queries";

// ---- docs (knowledge base) ------------------------------------------------

function useInvalidateDocs(id: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: projectKeys.docs(id) });
}

export function useUploadProjectDocs(id: string) {
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (vars: {
      files: File[];
      name?: string;
      typeIds?: string[];
      repoIds?: string[];
      description?: string;
    }) =>
      projectService.uploadDocs(id, vars.files, {
        title: vars.name,
        typeIds: vars.typeIds,
        repoIds: vars.repoIds,
        description: vars.description,
      }),
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

export function useRetryProjectDoc(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (documentId: string) => projectService.retryDoc(id, documentId),
    // Flip the doc to `processing` right away — the docs query polls while any doc is
    // non-terminal, so this also re-arms the poll.
    onMutate: (documentId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) =>
          prev
            ? {
                ...prev,
                documents: prev.documents.map((d) =>
                  d.id === documentId
                    ? { ...d, status: "processing" as const, errorMessage: null }
                    : d,
                ),
              }
            : prev,
        ),
      ]),
    onError: (_err, _documentId, context) => rollbackEdits(queryClient, context),
    onSuccess: (docs) => queryClient.setQueryData(projectKeys.docs(id), docs),
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

export function useSetDocRepos(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (vars: { documentId: string; repoIds: string[] }) =>
      projectService.setDocRepos(id, vars.documentId, vars.repoIds),
    onMutate: (vars) => {
      const docs = queryClient.getQueryData<ProjectDocs>(projectKeys.docs(id));
      // Resolve chip metadata (name/url) from any doc that already carries these repos.
      const knownRepos = new Map(
        docs?.documents.flatMap((d) => d.repos).map((r) => [r.repoId, r]) ?? [],
      );
      const repos = vars.repoIds.map(
        (rid) => knownRepos.get(rid) ?? { repoId: rid, name: null, url: null },
      );
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) =>
          prev
            ? {
                ...prev,
                documents: prev.documents.map((d) =>
                  d.id === vars.documentId ? { ...d, repoIds: vars.repoIds, repos } : d,
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
  const queryClient = useQueryClient();
  const invalidate = useInvalidateDocs(id);
  return useMutation({
    mutationFn: (name: string) => projectService.createDocType(id, name),
    onMutate: (name) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDocs>(projectKeys.docs(id), (prev) =>
          prev
            ? {
                ...prev,
                types: [
                  ...prev.types,
                  { id: typedId(ID_PREFIXES.draft), name, sortOrder: prev.types.length },
                ],
              }
            : prev,
        ),
      ]),
    onError: (_err, _name, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
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
