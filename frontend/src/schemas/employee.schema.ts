import { z } from "zod";

/** Mirrors the backend's EmployeeResponse (id/org_id/name/role/github_handle). */
export const employeeSchema = z
  .object({
    id: z.string(),
    org_id: z.string(),
    clerk_user_id: z.string().nullable().optional(),
    name: z.string(),
    role: z.string().nullable(),
    github_handle: z.string().nullable(),
  })
  .transform((e) => ({
    id: e.id,
    orgId: e.org_id,
    clerkUserId: e.clerk_user_id ?? null,
    name: e.name,
    role: e.role,
    githubHandle: e.github_handle,
  }));

export const employeeListSchema = z.array(employeeSchema);

export type Employee = z.infer<typeof employeeSchema>;
