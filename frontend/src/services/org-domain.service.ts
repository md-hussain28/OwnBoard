import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type CreateOrgDomainInput,
  type OrgDomain,
  orgDomainListSchema,
  orgDomainSchema,
  type UpdateOrgDomainInput,
} from "@/schemas/org-domain.schema";

export const orgDomainService = {
  async list(): Promise<OrgDomain[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.domains);
    return orgDomainListSchema.parse(data);
  },

  async create(input: CreateOrgDomainInput): Promise<OrgDomain> {
    const { data } = await getApiClient().post(API_ENDPOINTS.domains, { name: input.name });
    return orgDomainSchema.parse(data);
  },

  async update(id: string, input: UpdateOrgDomainInput): Promise<OrgDomain> {
    const { data } = await getApiClient().patch(API_ENDPOINTS.domain(id), { name: input.name });
    return orgDomainSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.domain(id));
  },
};
