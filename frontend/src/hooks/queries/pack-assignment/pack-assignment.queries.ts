import { useQuery } from "@tanstack/react-query";
import { packAssignmentService } from "@/services/pack-assignment.service";

export const packAssignmentKeys = {
  forPack: (packId: string) => ["pack-assignments", "pack", packId] as const,
  forEmployee: (employeeId: string) => ["pack-assignments", "employee", employeeId] as const,
  detail: (id: string) => ["pack-assignments", "detail", id] as const,
  documentContent: (id: string, documentId: string) =>
    ["pack-assignments", "detail", id, "document", documentId] as const,
};

export function usePackAssignments(packId: string) {
  return useQuery({
    queryKey: packAssignmentKeys.forPack(packId),
    queryFn: () => packAssignmentService.listForPack(packId),
    enabled: Boolean(packId),
  });
}

export function useEmployeeAssignments(employeeId: string) {
  return useQuery({
    queryKey: packAssignmentKeys.forEmployee(employeeId),
    queryFn: () => packAssignmentService.listForEmployee(employeeId),
    enabled: Boolean(employeeId),
  });
}

export function useAssignmentDetail(assignmentId: string) {
  return useQuery({
    queryKey: packAssignmentKeys.detail(assignmentId),
    queryFn: () => packAssignmentService.getDetail(assignmentId),
    enabled: Boolean(assignmentId),
  });
}

export function useAssignmentDocumentContent(assignmentId: string, documentId: string) {
  return useQuery({
    queryKey: packAssignmentKeys.documentContent(assignmentId, documentId),
    queryFn: () => packAssignmentService.getDocumentContent(assignmentId, documentId),
    enabled: Boolean(assignmentId) && Boolean(documentId),
    staleTime: Infinity, // document text doesn't change while reading
  });
}
