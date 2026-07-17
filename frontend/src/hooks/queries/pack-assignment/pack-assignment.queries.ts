import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PackAssignment, PackAssignmentStatus } from "@/schemas/packAssignment.schema";
import { packAssignmentService } from "@/services/pack-assignment.service";

export const packAssignmentKeys = {
  all: ["pack-assignments"] as const,
  forPack: (packId: string) => [...packAssignmentKeys.all, "pack", packId] as const,
  forEmployee: (employeeId: string) => [...packAssignmentKeys.all, "employee", employeeId] as const,
  detail: (id: string) => [...packAssignmentKeys.all, "detail", id] as const,
  documentContent: (id: string, documentId: string) =>
    [...packAssignmentKeys.all, "detail", id, "document", documentId] as const,
};

export function usePackAssignments(packId: string) {
  return useQuery({
    queryKey: packAssignmentKeys.forPack(packId),
    queryFn: () => packAssignmentService.listForPack(packId),
    enabled: Boolean(packId),
  });
}

export function useEmployeeAssignments(
  employeeId: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: packAssignmentKeys.forEmployee(employeeId),
    queryFn: () => packAssignmentService.listForEmployee(employeeId),
    enabled: Boolean(employeeId),
    refetchInterval: options?.refetchInterval,
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

const PROGRESS_ORDER: PackAssignmentStatus[] = [
  "passed",
  "failed",
  "quiz_in_progress",
  "ready_for_quiz",
  "reading",
  "assigned",
];

const PROGRESS_SHORT: Record<PackAssignmentStatus, string> = {
  assigned: "assigned",
  reading: "reading",
  ready_for_quiz: "ready",
  quiz_in_progress: "in quiz",
  passed: "passed",
  failed: "failed",
};

function summarizeProgress(assignments: PackAssignment[]): string {
  if (assignments.length === 0) return "Not assigned yet";
  const counts = new Map<PackAssignmentStatus, number>();
  for (const a of assignments) {
    counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  }
  return PROGRESS_ORDER.filter((s) => (counts.get(s) ?? 0) > 0)
    .map((s) => `${counts.get(s)} ${PROGRESS_SHORT[s]}`)
    .join(" · ");
}

export type PackAssignmentProgress = {
  text: string;
  loading: boolean;
  count: number;
};

/** Parallel pack-assignment fetches for list progress chips (admin quiz desk). */
export function usePackAssignmentProgress(packIds: string[], enabled = true) {
  const assignmentQueries = useQueries({
    queries: packIds.map((packId) => ({
      queryKey: packAssignmentKeys.forPack(packId),
      queryFn: () => packAssignmentService.listForPack(packId),
      enabled: enabled && packIds.length > 0,
      staleTime: 30_000,
    })),
  });

  return useMemo(() => {
    const map = new Map<string, PackAssignmentProgress>();
    packIds.forEach((packId, index) => {
      const q = assignmentQueries[index];
      if (!q || q.isLoading) {
        map.set(packId, { text: "", loading: true, count: 0 });
      } else if (q.isError) {
        map.set(packId, { text: "Progress unavailable", loading: false, count: 0 });
      } else {
        const data = q.data ?? [];
        map.set(packId, {
          text: summarizeProgress(data),
          loading: false,
          count: data.length,
        });
      }
    });
    return map;
  }, [packIds, assignmentQueries]);
}
