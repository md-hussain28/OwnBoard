import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  repoListSchema,
  repoSchema,
  type CreateRepoInput,
  type Repo,
} from "@/schemas/repo.schema";

export const repoService = {
  async list(): Promise<Repo[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.repos);
    return repoListSchema.parse(data);
  },

  async get(id: string): Promise<Repo> {
    const { data } = await getApiClient().get(API_ENDPOINTS.repo(id));
    return repoSchema.parse(data);
  },

  async create(input: CreateRepoInput): Promise<Repo> {
    const { data } = await getApiClient().post(API_ENDPOINTS.repos, input);
    return repoSchema.parse(data);
  },
};
