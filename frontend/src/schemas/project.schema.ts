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

export const resourceLinkSchema = z.object({ label: z.string(), url: z.string() });
export type ResourceLink = z.infer<typeof resourceLinkSchema>;

export const glossaryTermSchema = z.object({ term: z.string(), definition: z.string() });
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

export const repoAssigneeSchema = z
  .object({ employee_id: z.string(), name: z.string() })
  .transform((a) => ({ employeeId: a.employee_id, name: a.name }));
export type RepoAssignee = z.infer<typeof repoAssigneeSchema>;

export const projectRepoSchema = z
  .object({
    repo_id: z.string(),
    name: z.string().nullable(),
    url: z.string().nullable(),
    is_primary: z.boolean(),
    assignees: z.array(repoAssigneeSchema).default([]),
  })
  .transform((r) => ({
    repoId: r.repo_id,
    name: r.name,
    url: r.url,
    isPrimary: r.is_primary,
    assignees: r.assignees,
  }));
export type ProjectRepo = z.infer<typeof projectRepoSchema>;

export const projectFunctionTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    sort_order: z.number(),
    member_count: z.number().default(0),
    module_count: z.number().default(0),
  })
  .transform((t) => ({
    id: t.id,
    name: t.name,
    sortOrder: t.sort_order,
    memberCount: t.member_count,
    moduleCount: t.module_count,
  }));
export const projectFunctionTypeListSchema = z.array(projectFunctionTypeSchema);
export type ProjectFunctionType = z.infer<typeof projectFunctionTypeSchema>;

export const projectModuleSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    content: z.string().nullable(),
    resource_links: z.array(resourceLinkSchema).default([]),
    status: z.string(),
    sequence_order: z.number(),
    estimated_minutes: z.number().nullable(),
    function_type_ids: z.array(z.string()).default([]),
    function_type_names: z.array(z.string()).default([]),
    assigned_count: z.number().default(0),
    my_status: z.string().default("not_assigned"),
    my_completed: z.boolean().default(false),
  })
  .transform((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    content: m.content,
    resourceLinks: m.resource_links,
    status: m.status,
    sequenceOrder: m.sequence_order,
    estimatedMinutes: m.estimated_minutes,
    functionTypeIds: m.function_type_ids,
    functionTypeNames: m.function_type_names,
    assignedCount: m.assigned_count,
    myStatus: m.my_status,
    myCompleted: m.my_completed,
  }));
export const projectModuleListSchema = z.array(projectModuleSchema);
export type ProjectModule = z.infer<typeof projectModuleSchema>;

const projectBase = {
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  is_archived: z.boolean().default(false),
  repo_id: z.string().nullable(),
  repo_name: z.string().nullable(),
  repos: z.array(projectRepoSchema).default([]),
  lead_employee_id: z.string().nullable().default(null),
  lead_name: z.string().nullable().default(null),
  tech_stack: z.array(z.string()).default([]),
  resource_links: z.array(resourceLinkSchema).default([]),
  glossary: z.array(glossaryTermSchema).default([]),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  member_count: z.number(),
  track_count: z.number(),
  module_count: z.number().default(0),
};

type ProjectBaseInput = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  is_archived: boolean;
  repo_id: string | null;
  repo_name: string | null;
  repos: ProjectRepo[];
  lead_employee_id: string | null;
  lead_name: string | null;
  tech_stack: string[];
  resource_links: ResourceLink[];
  glossary: GlossaryTerm[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  track_count: number;
  module_count: number;
};

function toProject(p: ProjectBaseInput) {
  return {
    id: p.id,
    orgId: p.org_id,
    name: p.name,
    description: p.description,
    status: p.status,
    isArchived: p.is_archived,
    repoId: p.repo_id,
    repoName: p.repo_name,
    repos: p.repos,
    leadEmployeeId: p.lead_employee_id,
    leadName: p.lead_name,
    techStack: p.tech_stack,
    resourceLinks: p.resource_links,
    glossary: p.glossary,
    createdBy: p.created_by,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    memberCount: p.member_count,
    trackCount: p.track_count,
    moduleCount: p.module_count,
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

/** One repo-scoped targeting rule on an onboarding module: everyone on `repoId`, optionally
 * narrowed to the members of `domainId` (a project function type). */
export const trackRepoRuleSchema = z
  .object({
    repo_id: z.string(),
    repo_name: z.string().nullable().default(null),
    domain_id: z.string().nullable().default(null),
    domain_name: z.string().nullable().default(null),
  })
  .transform((r) => ({
    repoId: r.repo_id,
    repoName: r.repo_name,
    domainId: r.domain_id,
    domainName: r.domain_name,
  }));
export type TrackRepoRule = z.infer<typeof trackRepoRuleSchema>;

export const projectTrackSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: z.string(),
    sequence_order: z.number(),
    estimated_minutes: z.number().nullable(),
    due_offset_days: z.number().nullable().optional(),
    // Combinable union targeting (managers only). Audience = union of everyone / domains / repos / manual.
    target_all_members: z.boolean().default(true),
    domain_ids: z.array(z.string()).default([]),
    domain_names: z.array(z.string()).default([]),
    repo_rules: z.array(trackRepoRuleSchema).default([]),
    manual_employee_ids: z.array(z.string()).default([]),
    assign_scope: z.string().default("all_members"),
    assigned_count: z.number().default(0),
    assignee_ids: z.array(z.string()).default([]),
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
    targetAllMembers: t.target_all_members,
    domainIds: t.domain_ids,
    domainNames: t.domain_names,
    repoRules: t.repo_rules,
    manualEmployeeIds: t.manual_employee_ids,
    assignScope: t.assign_scope,
    assignedCount: t.assigned_count,
    assigneeIds: t.assignee_ids,
    assignmentId: t.assignment_id,
    myStatus: t.my_status,
    passed: t.passed,
  }));
export const projectTrackListSchema = z.array(projectTrackSchema);
export type ProjectTrack = z.infer<typeof projectTrackSchema>;

export type TrackRepoRuleInput = { repoId: string; domainId?: string | null };
export type SetTrackAssignmentInput = {
  targetAllMembers: boolean;
  domainIds: string[];
  repoRules: TrackRepoRuleInput[];
  manualEmployeeIds: string[];
};

export const projectDocTypeSchema = z
  .object({ id: z.string(), name: z.string(), sort_order: z.number().default(0) })
  .transform((t) => ({ id: t.id, name: t.name, sortOrder: t.sort_order }));
export type ProjectDocType = z.infer<typeof projectDocTypeSchema>;

export const projectDocRepoRefSchema = z
  .object({ repo_id: z.string(), name: z.string().nullable(), url: z.string().nullable() })
  .transform((r) => ({ repoId: r.repo_id, name: r.name, url: r.url }));
export type ProjectDocRepoRef = z.infer<typeof projectDocRepoRefSchema>;

export const projectDocSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().default(null),
    file_type: z.string(),
    status: z.string(),
    page_count: z.number().nullable().default(null),
    file_size_bytes: z.number().nullable().default(null),
    ingest_attempts: z.number().default(0),
    error_message: z.string().nullable().default(null),
    created_at: z.string(),
    updated_at: z.string().nullable().default(null),
    type_ids: z.array(z.string()).default([]),
    type_names: z.array(z.string()).default([]),
    repo_ids: z.array(z.string()).default([]),
    repos: z.array(projectDocRepoRefSchema).default([]),
  })
  .transform((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    fileType: d.file_type,
    status: d.status,
    pageCount: d.page_count,
    fileSizeBytes: d.file_size_bytes,
    ingestAttempts: d.ingest_attempts,
    errorMessage: d.error_message,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    typeIds: d.type_ids,
    typeNames: d.type_names,
    repoIds: d.repo_ids,
    repos: d.repos,
  }));
export type ProjectDoc = z.infer<typeof projectDocSchema>;

export const projectDocsSchema = z
  .object({
    pack_id: z.string(),
    documents: z.array(projectDocSchema).default([]),
    types: z.array(projectDocTypeSchema).default([]),
  })
  .transform((d) => ({ packId: d.pack_id, documents: d.documents, types: d.types }));
export type ProjectDocs = z.infer<typeof projectDocsSchema>;

export const memberSkillSchema = z
  .object({ name: z.string(), score: z.number(), commit_count: z.number() })
  .transform((s) => ({ name: s.name, score: s.score, commitCount: s.commit_count }));

export const memberFeatureSchema = z
  .object({
    file_path: z.string(),
    repo_name: z.string().nullable(),
    commit_count: z.number(),
    last_commit_at: z.string().nullable(),
  })
  .transform((f) => ({
    filePath: f.file_path,
    repoName: f.repo_name,
    commitCount: f.commit_count,
    lastCommitAt: f.last_commit_at,
  }));

export const projectMemberSkillsSchema = z
  .object({
    employee_id: z.string(),
    name: z.string(),
    github_handle: z.string().nullable(),
    matched: z.boolean(),
    total_commits: z.number(),
    skills: z.array(memberSkillSchema).default([]),
    features: z.array(memberFeatureSchema).default([]),
  })
  .transform((m) => ({
    employeeId: m.employee_id,
    name: m.name,
    githubHandle: m.github_handle,
    matched: m.matched,
    totalCommits: m.total_commits,
    skills: m.skills,
    features: m.features,
  }));
export const projectMemberSkillsListSchema = z.array(projectMemberSkillsSchema);
export type ProjectMemberSkills = z.infer<typeof projectMemberSkillsSchema>;

export const projectMemberSchema = z
  .object({
    employee_id: z.string(),
    name: z.string(),
    role: z.string().nullable(),
    app_role: z.string(),
    github_handle: z.string().nullable(),
    domain_name: z.string().nullable(),
    is_lead: z.boolean().default(false),
    function_type_id: z.string().nullable().default(null),
    function_type_name: z.string().nullable().default(null),
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
    isLead: m.is_lead,
    functionTypeId: m.function_type_id,
    functionTypeName: m.function_type_name,
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
    function_types: projectFunctionTypeListSchema.default([]),
    modules: projectModuleListSchema.default([]),
    my_readiness: projectReadinessSchema.nullable(),
    is_member: z.boolean(),
    is_admin: z.boolean(),
    my_is_lead: z.boolean().default(false),
    can_manage: z.boolean().default(false),
    locked: z.boolean(),
  })
  .transform((p) => ({
    ...toProject(p),
    repoUrl: p.repo_url,
    tracks: p.tracks,
    functionTypes: p.function_types,
    modules: p.modules,
    myReadiness: p.my_readiness,
    isMember: p.is_member,
    isAdmin: p.is_admin,
    myIsLead: p.my_is_lead,
    canManage: p.can_manage,
    locked: p.locked,
  }));
export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  status?: string;
  repoId?: string | null;
  leadEmployeeId?: string | null;
  techStack?: string[];
  resourceLinks?: ResourceLink[];
  glossary?: GlossaryTerm[];
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  repoId?: string | null;
  status?: string;
  isArchived?: boolean;
  techStack?: string[];
  resourceLinks?: ResourceLink[];
  glossary?: GlossaryTerm[];
};

export type CreateProjectTrackInput = {
  name: string;
  description?: string | null;
  sequenceOrder?: number;
  estimatedMinutes?: number | null;
  dueOffsetDays?: number | null;
};

export type AddProjectRepoInput = {
  repoId?: string | null;
  url?: string | null;
  name?: string | null;
  isPrimary?: boolean;
};

export type FunctionTypeInput = { name: string; sortOrder?: number };

export type UpdateProjectMemberInput = {
  functionTypeId?: string | null;
  clearFunctionType?: boolean;
  isLead?: boolean;
};

export type ModuleInput = {
  name: string;
  description?: string | null;
  content?: string | null;
  resourceLinks?: ResourceLink[];
  functionTypeIds?: string[];
  sequenceOrder?: number;
  estimatedMinutes?: number | null;
  status?: string;
};
