import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type Me, meSchema } from "@/schemas/me.schema";

export const meService = {
  async get(): Promise<Me> {
    const { data } = await getApiClient().get(API_ENDPOINTS.me);
    return meSchema.parse(data);
  },
};
