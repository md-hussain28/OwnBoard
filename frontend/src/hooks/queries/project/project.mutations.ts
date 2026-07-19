import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CacheEdit, cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import type {
  CreateProjectInput,
  MyProject,
  Project,
  ProjectDetail,
  UpdateProjectInput,
} from "@/schemas";
import { projectService } from "@/services";
import { projectKeys } from "./project.queries";
import { applyProjectPatch, optimisticProject } from "./project-cache";

// Mutations are split by domain across sibling files: members/repos/domains in
// `project-team.mutations.ts`, tracks/modules in `project-onboarding.mutations.ts`, docs in
// `project-docs.mutations.ts`. The pure optimistic-row builders live in `project-cache.ts`.

/**
 * Wire an optimistic mutation across several project caches. Snapshots every edit on
 * `onMutate`, rolls the whole batch back on error, and reconciles via `invalidate` on
 * `onSettled` — so the UI reflects the change instantly and the slow API catches up in
 * the background. Skip this (use plain invalidate) only when the server mints the id or
 * runs an async job whose result we can't predict.
 */
function optimistic<TVars>(
  queryClient: QueryClient,
  build: (vars: TVars) => CacheEdit[],
  invalidate: () => void,
) {
  return {
    onMutate: (vars: TVars) => optimisticEdits(queryClient, build(vars)),
    onError: (
      _err: unknown,
      _vars: TVars,
      context: Awaited<ReturnType<typeof optimisticEdits>> | undefined,
    ) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onMutate: async (input) => {
      // Keep the draft's client id so `onSuccess` can swap in the real `proj_…` id before
      // the refetch settles — otherwise clicking the fresh card links to `new_…`, which the
      // backend can't resolve → 404.
      const draft = optimisticProject(input);
      const snapshots = await optimisticEdits(queryClient, [
        cacheEdit<Project[]>(projectKeys.all, (prev) => (prev ? [draft, ...prev] : prev)),
      ]);
      return { draftId: draft.id, snapshots };
    },
    onSuccess: (project, _input, context) => {
      queryClient.setQueryData<Project[]>(projectKeys.all, (prev) =>
        prev?.map((p) => (p.id === context?.draftId ? project : p)),
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context?.snapshots),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.mine });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => projectService.update(id, input),
    ...optimistic<UpdateProjectInput>(
      queryClient,
      (input) => [
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? applyProjectPatch(prev, input) : prev,
        ),
        cacheEdit<Project[]>(projectKeys.all, (prev) =>
          prev?.map((p) => (p.id === id ? applyProjectPatch(p, input) : p)),
        ),
      ],
      () => {
        queryClient.invalidateQueries({ queryKey: projectKeys.all });
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      },
    ),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.remove(id),
    ...optimistic<string>(
      queryClient,
      (id) => [
        cacheEdit<Project[]>(projectKeys.all, (prev) => prev?.filter((p) => p.id !== id)),
        cacheEdit<MyProject[]>(projectKeys.mine, (prev) => prev?.filter((p) => p.id !== id)),
      ],
      () => {
        queryClient.invalidateQueries({ queryKey: projectKeys.all });
        queryClient.invalidateQueries({ queryKey: projectKeys.mine });
      },
    ),
  });
}

/** Invalidate everything a project detail view depends on. */
export function useInvalidateProject(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.members(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.functionTypes(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.modules(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
  };
}
