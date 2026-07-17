import type { PackAssignmentStatus } from "@/schemas/packAssignment.schema";

export const ASSIGNMENT_STATUS_LABEL: Record<PackAssignmentStatus, string> = {
  assigned: "Assigned",
  reading: "Reading",
  ready_for_quiz: "Ready for quiz",
  quiz_in_progress: "Quiz in progress",
  passed: "Passed",
  failed: "Failed",
};

export function assignmentStatusVariant(status: PackAssignmentStatus) {
  if (status === "passed") return "success" as const;
  if (status === "failed") return "destructive" as const;
  if (status === "quiz_in_progress") return "warning" as const;
  return "secondary" as const;
}
