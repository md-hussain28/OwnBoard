import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import type {
  AddProjectRepoInput,
  FunctionTypeInput,
  ProjectDetail,
  ProjectFunctionType,
  ProjectMember,
  UpdateProjectMemberInput,
} from "@/schemas";
import { projectService } from "@/services";
import { useInvalidateProject } from "./project.mutations";
import { projectKeys } from "./project.queries";
import { optimisticFunctionType, optimisticRepo } from "./project-cache";

// Team-shaped project mutations: members, linked repos, and function types (domains).

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
    onMutate: async (input) => {
      const count =
        queryClient.getQueryData<ProjectFunctionType[]>(projectKeys.functionTypes(id))?.length ?? 0;
      const draft = optimisticFunctionType(input, count);
      const snapshots = await optimisticEdits(queryClient, [
        cacheEdit<ProjectFunctionType[]>(projectKeys.functionTypes(id), (prev) =>
          prev ? [...prev, draft] : prev,
        ),
        cacheEdit<ProjectDetail>(projectKeys.detail(id), (prev) =>
          prev ? { ...prev, functionTypes: [...prev.functionTypes, draft] } : prev,
        ),
      ]);
      return { snapshots, draftId: draft.id };
    },
    onSuccess: (created, _input, context) => {
      // Swap the draft row for the persisted one immediately — role pickers read these
      // caches, and a lingering `new_…` id submitted to the API is rejected with a 422.
      const swap = (list: ProjectFunctionType[]) =>
        list.map((ft) => (ft.id === context?.draftId ? created : ft));
      queryClient.setQueryData<ProjectFunctionType[]>(projectKeys.functionTypes(id), (prev) =>
        prev ? swap(prev) : prev,
      );
      queryClient.setQueryData<ProjectDetail>(projectKeys.detail(id), (prev) =>
        prev ? { ...prev, functionTypes: swap(prev.functionTypes) } : prev,
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context?.snapshots),
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
