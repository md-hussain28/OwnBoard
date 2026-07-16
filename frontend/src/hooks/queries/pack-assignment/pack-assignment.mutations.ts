import { useMutation, useQueryClient } from "@tanstack/react-query";
import { packAssignmentService } from "@/services/pack-assignment.service";
import { packAssignmentKeys } from "@/hooks/queries/pack-assignment/pack-assignment.queries";

export function useCreateAssignments(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds: string[]) => packAssignmentService.createForPack(packId, employeeIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: packAssignmentKeys.forPack(packId) }),
  });
}

export function useRevokeAssignment(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => packAssignmentService.revoke(assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: packAssignmentKeys.forPack(packId) }),
  });
}

export function useAckDocument(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => packAssignmentService.ackDocument(assignmentId, documentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: packAssignmentKeys.detail(assignmentId) }),
  });
}

export function useStartQuiz(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => packAssignmentService.startQuiz(assignmentId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: packAssignmentKeys.detail(assignmentId) }),
  });
}
