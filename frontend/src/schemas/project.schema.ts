import { z } from "zod";

/** A member's lock/progress on one project (backend ProjectReadiness). */
export const projectReadinessSchema = z
  .object({
    locked: z.boolean(),
    total_tracks: z.number(),
    passed_tracks: z.number(),
    in_progress_tracks: z.number(),
    progress_pct: z.number(),
  })
  .transform((r) => ({
    locked: r.locked,
    totalTracks: r.total_tracks,
    passedTracks: r.passed_tracks,
    inProgressTracks: r.in_progress_tracks,
    progressPct: r.progress_pct,
  }));

export type ProjectReadiness = z.infer<typeof projectReadinessSchema>;

const projectBase = {
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  repo_id: z.string().nullable(),
  repo_name: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  member_count: z.number(),
  track_count: z.number(),
};

function toProject(p: {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  repo_id: string | null;
  repo_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  track_count: number;
}) {
  return {
    id: p.id,
    orgId: p.org_id,
    name: p.name,
    description: p.description,
    status: p.status,
    repoId: p.repo_id,
    repoName: p.repo_name,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    memberCount: p.member_count,
    trackCount: p.track_count,
  };
}

export const projectSchema = z.object(projectBase).transform(toProject);
export const projectListSchema = z.array(projectSchema);
export type Project = z.infer<typeof projectSchema>;

export const myProjectSchema = z
  .object({ ...projectBase, readiness: projectReadinessSchema })
  .transform((p) => ({ ...toProject(p), readiness: p.readiness }));
export const myProjectListSchema = z.array(myProjectSchema);
export type MyProject = z.infer<typeof myProjectSchema>;

export const projectTrackSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    sequence_order: z.number(),
    estimated_minutes: z.number().nullable(),
    due_offset_days: z.number().nullable().optional(),
    assignment_id: z.string().nullable(),
    my_status: z.string(),
    passed: z.boolean(),
  })
  .transform((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    status: t.status,
    sequenceOrder: t.sequence_order,
    estimatedMinutes: t.estimated_minutes,
    dueOffsetDays: t.due_offset_days ?? null,
    assignmentId: t.assignment_id,
    myStatus: t.my_status,
    passed: t.passed,
  }));
export const projectTrackListSchema = z.array(projectTrackSchema);
export type ProjectTrack = z.infer<typeof projectTrackSchema>;

export const projectMemberSchema = z
  .object({
    employee_id: z.string(),
    name: z.string(),
    role: z.string().nullable(),
    app_role: z.string(),
    github_handle: z.string().nullable(),
    domain_name: z.string().nullable(),
    readiness: projectReadinessSchema,
    is_go_to: z.boolean(),
  })
  .transform((m) => ({
    employeeId: m.employee_id,
    name: m.name,
    role: m.role,
    appRole: m.app_role,
    githubHandle: m.github_handle,
    domainName: m.domain_name,
    readiness: m.readiness,
    isGoTo: m.is_go_to,
  }));
export const projectMemberListSchema = z.array(projectMemberSchema);
export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const projectDetailSchema = z
  .object({
    ...projectBase,
    repo_url: z.string().nullable(),
    tracks: projectTrackListSchema,
    my_readiness: projectReadinessSchema.nullable(),
    is_member: z.boolean(),
    is_admin: z.boolean(),
    locked: z.boolean(),
  })
  .transform((p) => ({
    ...toProject(p),
    repoUrl: p.repo_url,
    tracks: p.tracks,
    myReadiness: p.my_readiness,
    isMember: p.is_member,
    isAdmin: p.is_admin,
    locked: p.locked,
  }));
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  repoId?: string | null;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  repoId?: string | null;
  status?: string;
};

export type CreateProjectTrackInput = {
  name: string;
  description?: string | null;
  sequenceOrder?: number;
  estimatedMinutes?: number | null;
  dueOffsetDays?: number | null;
};
