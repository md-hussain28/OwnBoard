import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CacheEdit,
  cacheEdit,
  optimisticEdits,
  rollbackEdits,
} from "@/hooks/queries/optimistic";
import { projectKeys } from "@/hooks/queries/project/project.queries";
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
} from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

// Docs (knowledge base) mutations live in the sibling `project-docs.mutations.ts`.

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Fields an update payload touches on a cached project — undefined inputs keep their value. */
function applyProjectPatch<T extends Project>(project: T, input: UpdateProjectInput): T {
  return {
    ...project,
    name: input.name ?? project.name,
    description: input.description !== undefined ? input.description : project.description,
    status: input.status ?? project.status,
    isArchived: input.isArchived ?? project.isArchived,
    repoId: input.repoId !== undefined ? input.repoId : project.repoId,
    techStack: input.techStack ?? project.techStack,
    resourceLinks: input.resourceLinks ?? project.resourceLinks,
    glossary: input.glossary ?? project.glossary,
  };
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
    onSuccess: () => {
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
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: AddProjectRepoInput) => projectService.addRepo(id, input),
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
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: FunctionTypeInput) => projectService.createFunctionType(id, input),
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
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: ModuleInput) => projectService.createModule(id, input),
    onSettled: invalidate,
  });
}

/** `input.x !== undefined ? input.x : current` — keep the current value when the field is absent. */
function keep<V>(next: V | undefined, current: V): V {
  return next !== undefined ? next : current;
}

/** Resolve function-type ids to their display names from the cached list (unknown ids dropped). */
function namesForFunctionTypes(ids: string[], functionTypes: ProjectFunctionType[] | undefined) {
  return ids
    .map((tid) => functionTypes?.find((f) => f.id === tid)?.name)
    .filter((n): n is string => Boolean(n));
}

function applyModulePatch(
  m: ProjectModule,
  input: Partial<ModuleInput>,
  functionTypes: ProjectFunctionType[] | undefined,
): ProjectModule {
  return {
    ...m,
    name: input.name ?? m.name,
    description: keep(input.description, m.description),
    content: keep(input.content, m.content),
    resourceLinks: input.resourceLinks ?? m.resourceLinks,
    sequenceOrder: input.sequenceOrder ?? m.sequenceOrder,
    estimatedMinutes: keep(input.estimatedMinutes, m.estimatedMinutes),
    status: input.status ?? m.status,
    functionTypeIds: input.functionTypeIds ?? m.functionTypeIds,
    functionTypeNames: input.functionTypeIds
      ? namesForFunctionTypes(input.functionTypeIds, functionTypes)
      : m.functionTypeNames,
  };
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
