import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { type CacheEdit, cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import type {
  AddProjectRepoInput,
  CreateProjectInput,
  CreateProjectTrackInput,
  FunctionTypeInput,
  ModuleInput,
  MyProject,
  Project,
  ProjectDetail,
  ProjectFunctionType,
  ProjectMember,
  ProjectModule,
  ProjectTrack,
  UpdateProjectInput,
  UpdateProjectMemberInput,
} from "@/schemas";
import { projectService } from "@/services";
import { projectKeys } from "./project.queries";
import {
  applyModulePatch,
  applyProjectPatch,
  optimisticFunctionType,
  optimisticModule,
  optimisticProject,
  optimisticRepo,
  optimisticTrack,
} from "./project-cache";

// Docs (knowledge base) mutations live in the sibling `project-docs.mutations.ts`; the pure
// optimistic-row builders and patch appliers live in `project-cache.ts`.

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
function useInvalidateProject(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.members(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.functionTypes(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.modules(id) });
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
  };
}

export function useAddProjectMembers(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { employeeIds: string[]; functionTypeId?: string | null }) =>
      projectService.addMembers(id, vars.employeeIds, vars.functionTypeId),
    onSettled: invalidate,
  });
}

export function useUpdateProjectMember(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { employeeId: string; input: UpdateProjectMemberInput }) =>
      projectService.updateMember(id, vars.employeeId, vars.input),
    onMutate: (vars) => {
      const functionTypes = queryClient.getQueryData<ProjectFunctionType[]>(
        projectKeys.functionTypes(id),
      );
      const patch = (member: ProjectMember): ProjectMember => {
        if (member.employeeId !== vars.employeeId) return member;
        let functionTypeId = member.functionTypeId;
        let functionTypeName = member.functionTypeName;
        if (vars.input.clearFunctionType) {
          functionTypeId = null;
          functionTypeName = null;
        } else if (vars.input.functionTypeId !== undefined) {
          functionTypeId = vars.input.functionTypeId;
          functionTypeName =
            functionTypes?.find((f) => f.id === vars.input.functionTypeId)?.name ?? null;
        }
        return {
          ...member,
          functionTypeId,
          functionTypeName,
          isLead: vars.input.isLead ?? member.isLead,
        };
      };
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectMember[]>(projectKeys.members(id), (prev) => prev?.map(patch)),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (employeeId: string) => projectService.removeMember(id, employeeId),
    onMutate: (employeeId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectMember[]>(projectKeys.members(id), (prev) =>
          prev?.filter((m) => m.employeeId !== employeeId),
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, memberCount: Math.max(0, prev.memberCount - 1) } : prev,
        ),
      ]),
    onError: (_err, _employeeId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

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
    mutationFn: (vars: {
      trackId: string;
      scope: "all_members" | "manual";
      employeeIds?: string[];
    }) =>
      projectService.setTrackAssignment(id, vars.trackId, {
        scope: vars.scope,
        employeeIds: vars.employeeIds,
      }),
    onMutate: (vars) => {
      const patch = (track: ProjectTrack): ProjectTrack => {
        if (track.id !== vars.trackId) return track;
        if (vars.scope === "manual") {
          return {
            ...track,
            assignScope: "manual",
            assigneeIds: vars.employeeIds ?? track.assigneeIds,
            assignedCount: vars.employeeIds?.length ?? track.assignedCount,
          };
        }
        return { ...track, assignScope: "all_members" };
      };
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

// ---- repos ----------------------------------------------------------------

export function useAddProjectRepo(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: AddProjectRepoInput) => projectService.addRepo(id, input),
    onMutate: (input) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, repos: [...prev.repos, optimisticRepo(input)] } : prev,
        ),
      ]),
    onSuccess: (project) => {
      // Adopt the server's authoritative repo list (real `repo_…` ids) so the "Set up sync"
      // link resolves — the "+ New repo by URL" path otherwise leaves a `new_…` draft repoId
      // that 404s until the refetch settles.
      queryClient.setQueryData<ProjectDetail>(projectKeys.detail(id), (prev) =>
        prev ? { ...prev, repos: project.repos } : prev,
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useRemoveProjectRepo(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (repoId: string) => projectService.removeRepo(id, repoId),
    onMutate: (repoId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, repos: prev.repos.filter((r) => r.repoId !== repoId) } : prev,
        ),
      ]),
    onError: (_err, _repoId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useSetRepoMembers(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { repoId: string; employeeIds: string[] }) =>
      projectService.setRepoMembers(id, vars.repoId, vars.employeeIds),
    onMutate: (vars) => {
      const members = queryClient.getQueryData<ProjectMember[]>(projectKeys.members(id));
      const assignees = vars.employeeIds.map((employeeId) => ({
        employeeId,
        name: members?.find((m) => m.employeeId === employeeId)?.name ?? "…",
      }));
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev
            ? {
                ...prev,
                repos: prev.repos.map((r) => (r.repoId === vars.repoId ? { ...r, assignees } : r)),
              }
            : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

// ---- function types -------------------------------------------------------

export function useCreateFunctionType(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: FunctionTypeInput) => projectService.createFunctionType(id, input),
    onMutate: (input) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectFunctionType[]>(projectKeys.functionTypes(id), (prev) =>
          prev ? [...prev, optimisticFunctionType(input, prev.length)] : prev,
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev
            ? {
                ...prev,
                functionTypes: [
                  ...prev.functionTypes,
                  optimisticFunctionType(input, prev.functionTypes.length),
                ],
              }
            : prev,
        ),
      ]),
    onError: (_err, _input, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useUpdateFunctionType(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { functionTypeId: string; input: Partial<FunctionTypeInput> }) =>
      projectService.updateFunctionType(id, vars.functionTypeId, vars.input),
    onMutate: (vars) => {
      const patch = (ft: ProjectFunctionType): ProjectFunctionType =>
        ft.id === vars.functionTypeId
          ? {
              ...ft,
              name: vars.input.name ?? ft.name,
              sortOrder: vars.input.sortOrder ?? ft.sortOrder,
            }
          : ft;
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectFunctionType[]>(projectKeys.functionTypes(id), (prev) => prev?.map(patch)),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, functionTypes: prev.functionTypes.map(patch) } : prev,
        ),
      ]);
    },
    onError: (_err, _vars, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

export function useRemoveFunctionType(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (functionTypeId: string) => projectService.removeFunctionType(id, functionTypeId),
    onMutate: (functionTypeId) =>
      optimisticEdits(queryClient, [
        cacheEdit<ProjectFunctionType[]>(projectKeys.functionTypes(id), (prev) =>
          prev?.filter((f) => f.id !== functionTypeId),
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev
            ? { ...prev, functionTypes: prev.functionTypes.filter((f) => f.id !== functionTypeId) }
            : prev,
        ),
      ]),
    onError: (_err, _functionTypeId, context) => rollbackEdits(queryClient, context),
    onSettled: invalidate,
  });
}

// ---- modules --------------------------------------------------------------

export function useCreateModule(id: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: ModuleInput) => projectService.createModule(id, input),
    onMutate: (input) => {
      const functionTypes = queryClient.getQueryData<ProjectFunctionType[]>(
        projectKeys.functionTypes(id),
      );
      return optimisticEdits(queryClient, [
        cacheEdit<ProjectModule[]>(projectKeys.modules(id), (prev) =>
          prev ? [...prev, optimisticModule(input, prev.length, functionTypes)] : prev,
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev
            ? {
                ...prev,
                modules: [
                  ...prev.modules,
                  optimisticModule(input, prev.modules.length, functionTypes),
                ],
              }
            : prev,
        ),
      ]);
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context),
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
