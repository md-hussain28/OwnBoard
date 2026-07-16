import { z } from "zod";
import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";

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
};
