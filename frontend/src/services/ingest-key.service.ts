import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import { type IngestKey, ingestKeyListSchema, ingestKeySchema } from "@/schemas";

export const ingestKeyService = {
  async list(repoId: string): Promise<IngestKey[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.ingestKeys(repoId));
    return ingestKeyListSchema.parse(data);
  },

  async create(repoId: string): Promise<IngestKey> {
    const { data } = await getApiClient().post(API_ENDPOINTS.ingestKeys(repoId), {});
    return ingestKeySchema.parse(data);
  },

  async revoke(repoId: string, keyId: string): Promise<IngestKey> {
    const { data } = await getApiClient().delete(API_ENDPOINTS.ingestKey(repoId, keyId));
    return ingestKeySchema.parse(data);
  },
};
