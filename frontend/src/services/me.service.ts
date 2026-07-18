import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import { type Me, meSchema } from "@/schemas";

export const meService = {
  async get(): Promise<Me> {
    const { data } = await getApiClient().get(API_ENDPOINTS.me);
    return meSchema.parse(data);
  },
};
