import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type IngestKey, ingestKeyListSchema, ingestKeySchema } from "@/schemas/ingest-key.schema";

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
