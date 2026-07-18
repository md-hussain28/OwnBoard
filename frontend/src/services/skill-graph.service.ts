import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import {
  type BusFactorFile,
  busFactorFileListSchema,
  type ExpertiseScore,
  expertiseScoreListSchema,
} from "@/schemas";

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
