import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type BusFactorFile,
  busFactorFileListSchema,
  type ExpertiseScore,
  expertiseScoreListSchema,
} from "@/schemas/skill-graph.schema";

export const skillGraphService = {
  async expertise(repoId: string): Promise<ExpertiseScore[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.skillGraphExpertise(repoId));
    return expertiseScoreListSchema.parse(data);
  },

  async busFactor(repoId: string): Promise<BusFactorFile[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.skillGraphBusFactor(repoId));
    return busFactorFileListSchema.parse(data);
  },
};
