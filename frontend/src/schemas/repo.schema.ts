import { z } from "zod";

export const repoSchema = z
  .object({
    id: z.string(),
    url: z.string(),
    name: z.string(),
    ingestedAt: z.string().nullable().optional(),
    ingested_at: z.string().nullable().optional(),
  })
  .transform(({ ingested_at, ingestedAt, ...rest }) => ({
    ...rest,
    ingestedAt: ingestedAt ?? ingested_at ?? null,
  }));

export const repoListSchema = z.array(repoSchema);

export const createRepoSchema = z.object({
  url: z.string(),
  name: z.string(),
});

export type Repo = z.infer<typeof repoSchema>;
export type CreateRepoInput = z.infer<typeof createRepoSchema>;
