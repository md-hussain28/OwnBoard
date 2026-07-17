import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/hooks/queries/project/project.queries";
import type {
  CreateProjectInput,
  CreateProjectTrackInput,
  UpdateProjectInput,
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

export function useAddProjectMembers(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds: string[]) => projectService.addMembers(id, employeeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useRemoveProjectMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => projectService.removeMember(id, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.members(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
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
