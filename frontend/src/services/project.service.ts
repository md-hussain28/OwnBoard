import { API_ENDPOINTS, getApiClient, performSignedUpload } from "@/lib/api";
import {
  type AddProjectRepoInput,
  type CreateProjectInput,
  type CreateProjectTrackInput,
  type FunctionTypeInput,
  type ModuleInput,
  type MyProject,
  myProjectListSchema,
  type Project,
  type ProjectDetail,
  type ProjectDocs,
  type ProjectDocType,
  type ProjectFunctionType,
  type ProjectMember,
  type ProjectMemberSkills,
  type ProjectModule,
  type ProjectTrack,
  projectDetailSchema,
  projectDocsSchema,
  projectDocTypeSchema,
  projectFunctionTypeListSchema,
  projectFunctionTypeSchema,
  projectListSchema,
  projectMemberListSchema,
  projectMemberSkillsListSchema,
  projectModuleListSchema,
  projectModuleSchema,
  projectSchema,
  projectTrackListSchema,
  projectTrackSchema,
  type SetTrackAssignmentInput,
  type UpdateProjectInput,
  type UpdateProjectMemberInput,
} from "@/schemas";

export const projectService = {
  async list(): Promise<Project[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projects);
    return projectListSchema.parse(data);
  },

  async listMine(): Promise<MyProject[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.myProjects);
    return myProjectListSchema.parse(data);
  },

  async get(id: string): Promise<ProjectDetail> {
    const { data } = await getApiClient().get(API_ENDPOINTS.project(id));
    return projectDetailSchema.parse(data);
  },

  async create(input: CreateProjectInput): Promise<Project> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projects, {
      name: input.name,
      description: input.description ?? null,
      status: input.status,
      repo_id: input.repoId ?? null,
      lead_employee_id: input.leadEmployeeId ?? null,
      tech_stack: input.techStack,
      resource_links: input.resourceLinks,
      glossary: input.glossary,
    });
    return projectSchema.parse(data);
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.repoId !== undefined) body.repo_id = input.repoId;
    if (input.status !== undefined) body.status = input.status;
    if (input.isArchived !== undefined) body.is_archived = input.isArchived;
    if (input.techStack !== undefined) body.tech_stack = input.techStack;
    if (input.resourceLinks !== undefined) body.resource_links = input.resourceLinks;
    if (input.glossary !== undefined) body.glossary = input.glossary;
    const { data } = await getApiClient().patch(API_ENDPOINTS.project(id), body);
    return projectSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.project(id));
  },

  // ---- repos --------------------------------------------------------------

  async addRepo(id: string, input: AddProjectRepoInput): Promise<Project> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectRepos(id), {
      repo_id: input.repoId ?? null,
      url: input.url ?? null,
      name: input.name ?? null,
      is_primary: input.isPrimary ?? false,
    });
    return projectSchema.parse(data);
  },

  async removeRepo(id: string, repoId: string): Promise<Project> {
    const { data } = await getApiClient().delete(API_ENDPOINTS.projectRepo(id, repoId));
    return projectSchema.parse(data);
  },

  /** Set exactly which project members are assigned to work on a linked repo. */
  async setRepoMembers(id: string, repoId: string, employeeIds: string[]): Promise<Project> {
    const { data } = await getApiClient().put(API_ENDPOINTS.projectRepoMembers(id, repoId), {
      employee_ids: employeeIds,
    });
    return projectSchema.parse(data);
  },

  // ---- function types -----------------------------------------------------

  async listFunctionTypes(id: string): Promise<ProjectFunctionType[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectFunctionTypes(id));
    return projectFunctionTypeListSchema.parse(data);
  },

  async createFunctionType(id: string, input: FunctionTypeInput): Promise<ProjectFunctionType> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectFunctionTypes(id), {
      name: input.name,
      sort_order: input.sortOrder ?? 0,
    });
    return projectFunctionTypeSchema.parse(data);
  },

  async updateFunctionType(
    id: string,
    functionTypeId: string,
    input: Partial<FunctionTypeInput>,
  ): Promise<ProjectFunctionType> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.sortOrder !== undefined) body.sort_order = input.sortOrder;
    const { data } = await getApiClient().patch(
      API_ENDPOINTS.projectFunctionType(id, functionTypeId),
      body,
    );
    return projectFunctionTypeSchema.parse(data);
  },

  async removeFunctionType(id: string, functionTypeId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectFunctionType(id, functionTypeId));
  },

  // ---- members ------------------------------------------------------------

  async listMembers(id: string): Promise<ProjectMember[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectMembers(id));
    return projectMemberListSchema.parse(data);
  },

  async listMemberSkills(id: string): Promise<ProjectMemberSkills[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectSkills(id));
    return projectMemberSkillsListSchema.parse(data);
  },

  // ---- docs (knowledge base) ----------------------------------------------

  async getDocs(id: string): Promise<ProjectDocs> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectDocs(id));
    return projectDocsSchema.parse(data);
  },

  /**
   * Upload reference PDFs straight to Supabase Storage via signed URLs, then register them so the
   * backend indexes them for "Ask project". Bytes bypass the Next.js/Vercel proxy, so the 20MB
   * limit is real (a proxied multipart POST would 413 at Vercel's ~4.5MB body cap).
   */
  async uploadDocs(
    id: string,
    files: File[],
    options?: {
      onProgress?: (percent: number) => void;
      /** Metadata captured in the upload modal, applied to every file in the batch. */
      title?: string;
      typeIds?: string[];
      repoIds?: string[];
      description?: string;
    },
  ): Promise<ProjectDocs> {
    const data = await performSignedUpload({
      urlsEndpoint: API_ENDPOINTS.projectDocsUploadUrls(id),
      registerEndpoint: API_ENDPOINTS.projectDocsRegister(id),
      files,
      onProgress: options?.onProgress,
      registerExtra: {
        title: options?.title?.trim() || null,
        type_ids: options?.typeIds ?? [],
        repo_ids: options?.repoIds ?? [],
        description: options?.description?.trim() || null,
      },
    });
    return projectDocsSchema.parse(data);
  },

  async deleteDoc(id: string, documentId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectDoc(id, documentId));
  },

  async setDocTypes(id: string, documentId: string, typeIds: string[]): Promise<ProjectDocs> {
    const { data } = await getApiClient().put(API_ENDPOINTS.projectDocTypesForDoc(id, documentId), {
      type_ids: typeIds,
    });
    return projectDocsSchema.parse(data);
  },

  /** Attach a document to exactly these project-linked repos. */
  async setDocRepos(id: string, documentId: string, repoIds: string[]): Promise<ProjectDocs> {
    const { data } = await getApiClient().put(API_ENDPOINTS.projectDocReposForDoc(id, documentId), {
      repo_ids: repoIds,
    });
    return projectDocsSchema.parse(data);
  },

  async createDocType(id: string, name: string): Promise<ProjectDocType> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectDocTypes(id), { name });
    return projectDocTypeSchema.parse(data);
  },

  async deleteDocType(id: string, typeId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectDocType(id, typeId));
  },

  async addMembers(
    id: string,
    employeeIds: string[],
    functionTypeId?: string | null,
  ): Promise<ProjectMember[]> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectMembers(id), {
      employee_ids: employeeIds,
      function_type_id: functionTypeId ?? null,
    });
    return projectMemberListSchema.parse(data);
  },

  async updateMember(
    id: string,
    employeeId: string,
    input: UpdateProjectMemberInput,
  ): Promise<ProjectMember[]> {
    const body: Record<string, unknown> = {};
    if (input.clearFunctionType) body.clear_function_type = true;
    else if (input.functionTypeId !== undefined) body.function_type_id = input.functionTypeId;
    if (input.isLead !== undefined) body.is_lead = input.isLead;
    const { data } = await getApiClient().patch(API_ENDPOINTS.projectMember(id, employeeId), body);
    return projectMemberListSchema.parse(data);
  },

  async removeMember(id: string, employeeId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectMember(id, employeeId));
  },

  // ---- tracks -------------------------------------------------------------

  async listTracks(id: string): Promise<ProjectTrack[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectTracks(id));
    return projectTrackListSchema.parse(data);
  },

  /** Set a module's combinable audience: the union of everyone / selected domains / repo(+domain)
   * rules / hand-picked members. */
  async setTrackAssignment(
    id: string,
    trackId: string,
    input: SetTrackAssignmentInput,
  ): Promise<ProjectTrack> {
    const { data } = await getApiClient().put(API_ENDPOINTS.projectTrackAssignment(id, trackId), {
      target_all_members: input.targetAllMembers,
      domain_ids: input.domainIds,
      repo_rules: input.repoRules.map((r) => ({
        repo_id: r.repoId,
        domain_id: r.domainId ?? null,
      })),
      manual_employee_ids: input.manualEmployeeIds,
    });
    return projectTrackSchema.parse(data);
  },

  /** Create a project-specific track (draft). Reuses the doc-pack create endpoint with project_id set;
   * the caller then authors documents/quiz on the existing /app/tracks/[id] surface. */
  async createTrack(projectId: string, input: CreateProjectTrackInput): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      name: input.name,
      description: input.description ?? null,
      project_id: projectId,
    };
    if (input.sequenceOrder !== undefined) body.sequence_order = input.sequenceOrder;
    if (input.estimatedMinutes != null) body.estimated_minutes = input.estimatedMinutes;
    if (input.dueOffsetDays != null) body.due_offset_days = input.dueOffsetDays;
    const { data } = await getApiClient().post(API_ENDPOINTS.docPacks, body);
    return { id: (data as { id: string }).id };
  },

  // ---- modules ------------------------------------------------------------

  async listModules(id: string): Promise<ProjectModule[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectModules(id));
    return projectModuleListSchema.parse(data);
  },

  async createModule(id: string, input: ModuleInput): Promise<ProjectModule> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectModules(id), {
      name: input.name,
      description: input.description ?? null,
      content: input.content ?? null,
      resource_links: input.resourceLinks,
      function_type_ids: input.functionTypeIds,
      sequence_order: input.sequenceOrder ?? 0,
      estimated_minutes: input.estimatedMinutes ?? null,
      status: input.status,
    });
    return projectModuleSchema.parse(data);
  },

  async updateModule(
    id: string,
    moduleId: string,
    input: Partial<ModuleInput>,
  ): Promise<ProjectModule> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.content !== undefined) body.content = input.content;
    if (input.resourceLinks !== undefined) body.resource_links = input.resourceLinks;
    if (input.functionTypeIds !== undefined) body.function_type_ids = input.functionTypeIds;
    if (input.sequenceOrder !== undefined) body.sequence_order = input.sequenceOrder;
    if (input.estimatedMinutes !== undefined) body.estimated_minutes = input.estimatedMinutes;
    if (input.status !== undefined) body.status = input.status;
    const { data } = await getApiClient().patch(API_ENDPOINTS.projectModule(id, moduleId), body);
    return projectModuleSchema.parse(data);
  },

  async removeModule(id: string, moduleId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectModule(id, moduleId));
  },

  async setModuleProgress(id: string, moduleId: string, status: string): Promise<ProjectModule> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectModuleProgress(id, moduleId), {
      status,
    });
    return projectModuleSchema.parse(data);
  },
};
