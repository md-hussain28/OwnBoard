import { z } from "zod";
import { packAssignmentStatusSchema } from "./packAssignment.schema";

const cohortTrackSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sequence_order: z.number(),
  })
  .transform((t) => ({
    id: t.id,
    name: t.name,
    sequenceOrder: t.sequence_order,
  }));

const cohortEmployeeRowSchema = z
  .object({
    employee_id: z.string(),
    employee_name: z.string(),
    cells: z.record(z.string(), packAssignmentStatusSchema),
    passed_count: z.number(),
    total_count: z.number(),
  })
  .transform((e) => ({
    employeeId: e.employee_id,
    employeeName: e.employee_name,
    cells: e.cells,
    passedCount: e.passed_count,
    totalCount: e.total_count,
  }));

export const cohortDashboardSchema = z
  .object({
    tracks: z.array(cohortTrackSchema),
    employees: z.array(cohortEmployeeRowSchema),
    total_assignments: z.number(),
    passed_assignments: z.number(),
    overdue_assignments: z.number(),
    not_started_assignments: z.number(),
    completion_pct: z.number(),
    avg_days_to_onboard: z.number().nullable(),
    fully_onboarded_count: z.number(),
  })
  .transform((c) => ({
    tracks: c.tracks,
    employees: c.employees,
    totalAssignments: c.total_assignments,
    passedAssignments: c.passed_assignments,
    overdueAssignments: c.overdue_assignments,
    notStartedAssignments: c.not_started_assignments,
    completionPct: c.completion_pct,
    avgDaysToOnboard: c.avg_days_to_onboard,
    fullyOnboardedCount: c.fully_onboarded_count,
  }));

export type CohortTrack = z.infer<typeof cohortTrackSchema>;
export type CohortEmployeeRow = z.infer<typeof cohortEmployeeRowSchema>;
export type CohortDashboard = z.infer<typeof cohortDashboardSchema>;
