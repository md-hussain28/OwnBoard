import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type OptimisticSnapshot,
  optimisticUpdate,
  rollbackOptimistic,
} from "@/hooks/queries/optimistic";
import { packAssignmentKeys } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import type { AssignmentDetail, PackAssignment } from "@/schemas/packAssignment.schema";
import { packAssignmentService } from "@/services/pack-assignment.service";

export function useCreateAssignments(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeIds: string[]) => packAssignmentService.createForPack(packId, employeeIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: packAssignmentKeys.forPack(packId) });
    },
  });
}

export function useRevokeAssignment(packId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => packAssignmentService.revoke(assignmentId),
    onMutate: async (assignmentId) => {
      const snapshot = await optimisticUpdate<PackAssignment[]>(
        queryClient,
        packAssignmentKeys.forPack(packId),
        (prev) => prev?.filter((a) => a.id !== assignmentId),
      );
      return snapshot;
    },
    onError: (_err, _id, context) => {
      rollbackOptimistic(queryClient, packAssignmentKeys.forPack(packId), context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: packAssignmentKeys.forPack(packId) });
    },
  });
}

/** Status transition after acknowledging a document: reading → ready_for_quiz once every doc is acked, assigned → reading on the first ack. */
function statusAfterAck(status: AssignmentDetail["status"], allAcked: boolean) {
  if (allAcked && status === "reading") return "ready_for_quiz";
  if (status === "assigned") return "reading";
  return status;
}

export function useAckDocument(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => packAssignmentService.ackDocument(assignmentId, documentId),
    onMutate: async (documentId) => {
      const now = new Date().toISOString();
      const snapshot = await optimisticUpdate<AssignmentDetail>(
        queryClient,
        packAssignmentKeys.detail(assignmentId),
        (prev) => {
          if (!prev) return prev;
          const documents = prev.documents.map((d) =>
            d.id === documentId ? { ...d, acknowledgedAt: d.acknowledgedAt ?? now } : d,
          );
          const allAcked = documents.every((d) => d.acknowledgedAt);
          return {
            ...prev,
            documents,
            quizUnlocked: allAcked || prev.quizUnlocked,
            status: statusAfterAck(prev.status, allAcked),
          };
        },
      );
      return snapshot;
    },
    onError: (_err, _id, context: OptimisticSnapshot<AssignmentDetail> | undefined) => {
      rollbackOptimistic(queryClient, packAssignmentKeys.detail(assignmentId), context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: packAssignmentKeys.detail(assignmentId) });
    },
  });
}

export function useStartQuiz(assignmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => packAssignmentService.startQuiz(assignmentId),
    onMutate: async () => {
      // Flip status immediately so the pane doesn't wait on the network round-trip.
      return optimisticUpdate<AssignmentDetail>(
        queryClient,
        packAssignmentKeys.detail(assignmentId),
        (prev) => (prev ? { ...prev, status: "quiz_in_progress" } : prev),
      );
    },
    onError: (_err, _void, context: OptimisticSnapshot<AssignmentDetail> | undefined) => {
      rollbackOptimistic(queryClient, packAssignmentKeys.detail(assignmentId), context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: packAssignmentKeys.detail(assignmentId) });
    },
  });
}
