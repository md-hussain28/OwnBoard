import { z } from "zod";

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["new_hire", "senior_engineer", "engineering_manager"]),
  repoId: z.string().nullable().optional(),
});

export const employeeListSchema = z.array(employeeSchema);

export type Employee = z.infer<typeof employeeSchema>;
