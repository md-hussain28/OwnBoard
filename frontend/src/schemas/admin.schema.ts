import { z } from "zod";

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable().optional(),
  membersCount: z.number(),
  createdAt: z.string(),
});

export const tenantListSchema = z.array(tenantSchema);

export const createTenantSchema = z.object({
  name: z.string().min(1),
  adminEmail: z.string().email(),
  slug: z.string().optional(),
});

export const createTenantResponseSchema = tenantSchema.extend({
  adminEmail: z.string(),
  invitationId: z.string().nullable(),
  invitationError: z.string().nullable(),
});

export const platformAdminMeSchema = z.object({
  isPlatformAdmin: z.boolean(),
  email: z.string().optional(),
});

export type Tenant = z.infer<typeof tenantSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CreateTenantResponse = z.infer<typeof createTenantResponseSchema>;
export type PlatformAdminMe = z.infer<typeof platformAdminMeSchema>;
