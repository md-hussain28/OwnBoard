import { z } from "zod";
import { appRoleSchema } from "./employee.schema";

/** Mirrors backend MeResponse — org fields null when no active organization. */
export const meSchema = z
  .object({
    user_id: z.string(),
    org_id: z.string().nullable().optional(),
    employee_id: z.string().nullable().optional(),
    app_role: appRoleSchema.nullable().optional(),
  })
  .transform((m) => ({
    userId: m.user_id,
    orgId: m.org_id ?? null,
    employeeId: m.employee_id ?? null,
    appRole: m.app_role ?? null,
  }));

export type Me = z.infer<typeof meSchema>;
