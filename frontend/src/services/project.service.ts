import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type CreateProjectInput,
  type CreateProjectTrackInput,
  type MyProject,
  myProjectListSchema,
  type Project,
  type ProjectDetail,
  type ProjectMember,
  type ProjectTrack,
  projectDetailSchema,
  projectListSchema,
  projectMemberListSchema,
  projectSchema,
  projectTrackListSchema,
  type UpdateProjectInput,
} from "@/schemas/project.schema";

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
      repo_id: input.repoId ?? null,
    });
    return projectSchema.parse(data);
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.repoId !== undefined) body.repo_id = input.repoId;
    if (input.status !== undefined) body.status = input.status;
    const { data } = await getApiClient().patch(API_ENDPOINTS.project(id), body);
    return projectSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.project(id));
  },

  async listMembers(id: string): Promise<ProjectMember[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectMembers(id));
    return projectMemberListSchema.parse(data);
  },

  async addMembers(id: string, employeeIds: string[]): Promise<ProjectMember[]> {
    const { data } = await getApiClient().post(API_ENDPOINTS.projectMembers(id), {
      employee_ids: employeeIds,
    });
    return projectMemberListSchema.parse(data);
  },

  async removeMember(id: string, employeeId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.projectMember(id, employeeId));
  },

  async listTracks(id: string): Promise<ProjectTrack[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.projectTracks(id));
    return projectTrackListSchema.parse(data);
  },

  /** Create a project-specific track (draft). Reuses the doc-pack create endpoint with project_id set;
   * the caller then authors documents/quiz on the existing /app/tracks/[id] surface. */
  async createTrack(projectId: string, input: CreateProjectTrackInput): Promise<{ id: string }> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPacks, {
      name: input.name,
      description: input.description ?? null,
      project_id: projectId,
    });
    return { id: (data as { id: string }).id };
  },
};
