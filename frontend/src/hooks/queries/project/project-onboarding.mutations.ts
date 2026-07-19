import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import type {
  CreateProjectTrackInput,
  ModuleInput,
  ProjectDetail,
  ProjectFunctionType,
  ProjectModule,
  ProjectTrack,
  SetTrackAssignmentInput,
} from "@/schemas";
import { projectService } from "@/services";
import { useInvalidateProject } from "./project.mutations";
import { projectKeys } from "./project.queries";
import { applyModulePatch, optimisticModule, optimisticTrack } from "./project-cache";

// Onboarding-shaped project mutations: tracks (doc packs) and modules + per-member progress.

export function useCreateProjectTrack(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectTrackInput) => projectService.createTrack(id, input),
    onMutate: async (input) => {
      // One shared draft row across both caches so its client id can be swapped for the real
      // one on success — a `ModuleRow` links to `track.id`, and a `new_…` id would 404.
      const tracks = queryClient.getQueryData<ProjectTrack[]>(projectKeys.tracks(id));
      const draft = optimisticTrack(input, tracks?.length ?? 0);
      const snapshots = await optimisticEdits(queryClient, [
        cacheEdit<ProjectTrack[]>(projectKeys.tracks(id), (prev) =>
          prev ? [...prev, draft] : prev,
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, tracks: [...prev.tracks, draft] } : prev,
        ),
      ]);
      return { draftId: draft.id, snapshots };
    },
    onSuccess: (result, _input, context) => {
      // createTrack returns only the persisted id; graft it onto the existing draft row.
      const patch = (t: ProjectTrack) => (t.id === context?.draftId ? { ...t, id: result.id } : t);
      queryClient.setQueryData<ProjectTrack[]>(projectKeys.tracks(id), (prev) => prev?.map(patch));
      queryClient.setQueryData<ProjectDetail>(projectKeys.detail(id), (prev) =>
        prev ? { ...prev, tracks: prev.tracks.map(patch) } : prev,
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context?.snapshots),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tracks(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useSetTrackAssignment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    // The final assignee set is a server-computed union (everyone/domains/repos/manual), so the
    // resulting counts aren't predictable client-side — patch the targeting fields the editor set
    // and let invalidation refresh counts/names.
    mutationFn: (vars: { trackId: string } & SetTrackAssignmentInput) =>
      projectService.setTrackAssignment(id, vars.trackId, vars),
    onMutate: (vars) => {
      const patch = (track: ProjectTrack): ProjectTrack =>
        track.id === vars.trackId
          ? {
              ...track,
              targetAllMembers: vars.targetAllMembers,
              domainIds: vars.domainIds,
              manualEmployeeIds: vars.manualEmployeeIds,
            }
          : track;
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectTrack[]>(projectKeys.tracks(id), (prev) => prev?.map(patch)),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, tracks: prev.tracks.map(patch) } : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tracks(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.members(id) });
    },
  });
}

// ---- modules --------------------------------------------------------------

export function useCreateModule(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: ModuleInput) => projectService.createModule(id, input),
    onMutate: async (input) => {
      // One shared draft row across both caches so `onSuccess` can swap in the persisted
      // module — until then the row's `new_…` id keeps its edit/delete actions inert.
      const functionTypes = queryClient.getQueryData<ProjectFunctionType[]>(
        projectKeys.functionTypes(id),
      );
      const count = queryClient.getQueryData<ProjectModule[]>(projectKeys.modules(id))?.length ?? 0;
      const draft = optimisticModule(input, count, functionTypes);
      const snapshots = await optimisticEdits(queryClient, [
        cacheEdit<ProjectModule[]>(projectKeys.modules(id), (prev) =>
          prev ? [...prev, draft] : prev,
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, modules: [...prev.modules, draft] } : prev,
        ),
      ]);
      return { draftId: draft.id, snapshots };
    },
    onSuccess: (created, _input, context) => {
      const swap = (m: ProjectModule) => (m.id === context?.draftId ? created : m);
      queryClient.setQueryData<ProjectModule[]>(projectKeys.modules(id), (prev) => prev?.map(swap));
      queryClient.setQueryData<ProjectDetail>(projectKeys.detail(id), (prev) =>
        prev ? { ...prev, modules: prev.modules.map(swap) } : prev,
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context?.snapshots),
    onSettled: invalidate,
  });
}

export function useUpdateModule(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { moduleId: string; input: Partial<ModuleInput> }) =>
      projectService.updateModule(id, vars.moduleId, vars.input),
    onMutate: (vars) => {
      const functionTypes = queryClient.getQueryData<ProjectFunctionType[]>(
        projectKeys.functionTypes(id),
      );
      const patch = (m: ProjectModule): ProjectModule =>
        m.id === vars.moduleId ? applyModulePatch(m, vars.input, functionTypes) : m;
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectModule[]>(projectKeys.modules(id), (prev) => prev?.map(patch)),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, modules: prev.modules.map(patch) } : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useRemoveModule(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (moduleId: string) => projectService.removeModule(id, moduleId),
    onMutate: (moduleId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectModule[]>(projectKeys.modules(id), (prev) =>
          prev?.filter((m) => m.id !== moduleId),
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, modules: prev.modules.filter((m) => m.id !== moduleId) } : prev,
        ),
      ]),
    onError: (_err, _moduleId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useSetModuleProgress(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { moduleId: string; status: string }) =>
      projectService.setModuleProgress(id, vars.moduleId, vars.status),
    onMutate: (vars) => {
      const patch = (m: ProjectModule): ProjectModule =>
        m.id === vars.moduleId
          ? { ...m, myStatus: vars.status, myCompleted: vars.status === "completed" }
          : m;
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectModule[]>(projectKeys.modules(id), (prev) => prev?.map(patch)),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, modules: prev.modules.map(patch) } : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}
