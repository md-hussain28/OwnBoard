import { z } from "zod";

export const appRoleSchema = z.enum(["admin", "member"]);
export type AppRole = z.infer<typeof appRoleSchema>;

/** Mirrors the backend's EmployeeResponse. */
export const employeeSchema = z
  .object({
    id: z.string(),
    org_id: z.string(),
    clerk_user_id: z.string().nullable().optional(),
    name: z.string(),
    role: z.string().nullable(),
    app_role: appRoleSchema,
    github_handle: z.string().nullable(),
    domain_id: z.string().nullable().optional(),
    domain_name: z.string().nullable().optional(),
  })
  .transform((e) => ({
    id: e.id,
    orgId: e.org_id,
    clerkUserId: e.clerk_user_id ?? null,
    name: e.name,
    role: e.role,
    appRole: e.app_role,
    githubHandle: e.github_handle,
    domainId: e.domain_id ?? null,
    domainName: e.domain_name ?? null,
  }));

export const employeeListSchema = z.array(employeeSchema);

export type Employee = z.infer<typeof employeeSchema>;

export const employeeInviteSchema = z
  .object({
    id: z.string(),
    email_address: z.string(),
    app_role: appRoleSchema,
    status: z.string(),
    role: z.string().nullable().optional(),
    github_handle: z.string().nullable().optional(),
    domain_id: z.string().nullable().optional(),
    domain_name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
  })
  .transform((i) => ({
    id: i.id,
    emailAddress: i.email_address,
    appRole: i.app_role,
    status: i.status,
    role: i.role ?? null,
    githubHandle: i.github_handle ?? null,
    domainId: i.domain_id ?? null,
    domainName: i.domain_name ?? null,
    createdAt: i.created_at ?? null,
  }));

export const employeeInviteListSchema = z.array(employeeInviteSchema);

export type EmployeeInvitation = z.infer<typeof employeeInviteSchema>;

export type InviteEmployeeInput = {
  email: string;
  appRole?: AppRole;
  role?: string | null;
  githubHandle?: string | null;
  domainId?: string | null;
};

export type UpdateEmployeeInput = {
  name?: string;
  role?: string | null;
  githubHandle?: string | null;
  appRole?: AppRole;
  domainId?: string | null;
};
