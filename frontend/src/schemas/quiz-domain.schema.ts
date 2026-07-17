import { z } from "zod";

export const quizDomainSchema = z
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

export const quizDomainListSchema = z.array(quizDomainSchema);

export type QuizDomain = z.infer<typeof quizDomainSchema>;

export type CreateQuizDomainInput = {
  name: string;
};
