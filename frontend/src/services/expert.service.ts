import { z } from "zod";
import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type ExpertReferral, expertReferralSchema } from "@/schemas/expert.schema";

const expertSchema = z.object({
  id: z.string(),
  name: z.string(),
  subsystems: z.array(z.string()).optional(),
});

const expertListSchema = z.array(expertSchema);

export type Expert = z.infer<typeof expertSchema>;

export const expertService = {
  async list(): Promise<Expert[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.experts);
    return expertListSchema.parse(data);
  },

  /** Route a new hire to the best expert for a file/subsystem (PRD §6.6). */
  async routeToExpert(repoId: string, filePath: string): Promise<ExpertReferral> {
    const { data } = await getApiClient().get(API_ENDPOINTS.repoExperts(repoId), {
      params: { file_path: filePath },
    });
    return expertReferralSchema.parse(data);
  },
};
