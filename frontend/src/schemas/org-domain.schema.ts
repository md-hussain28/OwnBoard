import { z } from "zod";

export const orgDomainSchema = z
  .object({
    id: z.string(),
    org_id: z.string(),
    name: z.string(),
    is_default: z.boolean(),
  })
  .transform((d) => ({
    id: d.id,
    orgId: d.org_id,
    name: d.name,
    isDefault: d.is_default,
  }));

export const orgDomainListSchema = z.array(orgDomainSchema);

export type OrgDomain = z.infer<typeof orgDomainSchema>;

export type CreateOrgDomainInput = {
  name: string;
};

export type UpdateOrgDomainInput = {
  name: string;
};
