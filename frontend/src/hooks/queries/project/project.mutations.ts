import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/hooks/queries/project/project.queries";
import type {
  AddProjectRepoInput,
  CreateProjectInput,
  CreateProjectTrackInput,
  FunctionTypeInput,
  ModuleInput,
  UpdateProjectInput,
  UpdateProjectMemberInput,
} from "@/schemas/project.schema";
import { projectService } from "@/services/project.service";

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => projectService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
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
    onSuccess: invalidate,
  });
}

export function useUpdateProjectMember(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { employeeId: string; input: UpdateProjectMemberInput }) =>
      projectService.updateMember(id, vars.employeeId, vars.input),
    onSuccess: invalidate,
  });
}

export function useRemoveProjectMember(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (employeeId: string) => projectService.removeMember(id, employeeId),
    onSuccess: invalidate,
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

// ---- repos ----------------------------------------------------------------

export function useAddProjectRepo(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: AddProjectRepoInput) => projectService.addRepo(id, input),
    onSuccess: invalidate,
  });
}

export function useRemoveProjectRepo(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (repoId: string) => projectService.removeRepo(id, repoId),
    onSuccess: invalidate,
  });
}

// ---- function types -------------------------------------------------------

export function useCreateFunctionType(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: FunctionTypeInput) => projectService.createFunctionType(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateFunctionType(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { functionTypeId: string; input: Partial<FunctionTypeInput> }) =>
      projectService.updateFunctionType(id, vars.functionTypeId, vars.input),
    onSuccess: invalidate,
  });
}

export function useRemoveFunctionType(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (functionTypeId: string) => projectService.removeFunctionType(id, functionTypeId),
    onSuccess: invalidate,
  });
}

// ---- modules --------------------------------------------------------------

export function useCreateModule(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (input: ModuleInput) => projectService.createModule(id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateModule(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { moduleId: string; input: Partial<ModuleInput> }) =>
      projectService.updateModule(id, vars.moduleId, vars.input),
    onSuccess: invalidate,
  });
}

export function useRemoveModule(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (moduleId: string) => projectService.removeModule(id, moduleId),
    onSuccess: invalidate,
  });
}

export function useSetModuleProgress(id: string) {
  const invalidate = useInvalidateProject(id);
  return useMutation({
    mutationFn: (vars: { moduleId: string; status: string }) =>
      projectService.setModuleProgress(id, vars.moduleId, vars.status),
    onSuccess: invalidate,
  });
}
