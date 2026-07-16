import { isAxiosError } from "axios";
import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  createTenantResponseSchema,
  platformAdminMeSchema,
  tenantListSchema,
  type CreateTenantInput,
  type CreateTenantResponse,
  type PlatformAdminMe,
  type Tenant,
} from "@/schemas/admin.schema";

function apiErrorMessage(err: unknown, fallback: string): Error {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return new Error(data.error);
  }
  return err instanceof Error ? err : new Error(fallback);
}

export const adminService = {
  async me(): Promise<PlatformAdminMe> {
    const { data } = await getApiClient().get(API_ENDPOINTS.adminMe);
    return platformAdminMeSchema.parse(data);
  },

  async listTenants(): Promise<Tenant[]> {
    try {
      const { data } = await getApiClient().get(API_ENDPOINTS.adminTenants);
      return tenantListSchema.parse(data);
    } catch (err) {
      throw apiErrorMessage(err, "Failed to list tenants");
    }
  },

  async createTenant(input: CreateTenantInput): Promise<CreateTenantResponse> {
    try {
      const { data } = await getApiClient().post(API_ENDPOINTS.adminTenants, input);
      return createTenantResponseSchema.parse(data);
    } catch (err) {
      throw apiErrorMessage(err, "Failed to create tenant");
    }
  },

  async deleteTenant(id: string): Promise<void> {
    try {
      await getApiClient().delete(API_ENDPOINTS.adminTenant(id));
    } catch (err) {
      throw apiErrorMessage(err, "Failed to delete tenant");
    }
  },
};
