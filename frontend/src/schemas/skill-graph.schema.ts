import { z } from "zod";

export const expertiseScoreSchema = z
  .object({
    file_path: z.string(),
    contributor_id: z.string(),
    contributor_name: z.string(),
    commit_count: z.number(),
    review_count: z.number(),
    revert_adjusted_score: z.number(),
    last_commit_at: z.string().nullable().optional(),
  })
  .transform((r) => ({
    filePath: r.file_path,
    contributorId: r.contributor_id,
    contributorName: r.contributor_name,
    commitCount: r.commit_count,
    reviewCount: r.review_count,
    score: r.revert_adjusted_score,
    lastCommitAt: r.last_commit_at ?? null,
  }));

export const busFactorFileSchema = z
  .object({
    file_path: z.string(),
    risk_level: z.enum(["low", "medium", "high"]),
    top_contributor_ids: z.array(z.string()),
  })
  .transform((r) => ({
    filePath: r.file_path,
    riskLevel: r.risk_level,
    topContributorIds: r.top_contributor_ids,
  }));

export const expertiseScoreListSchema = z.array(expertiseScoreSchema);
export const busFactorFileListSchema = z.array(busFactorFileSchema);

export type ExpertiseScore = z.infer<typeof expertiseScoreSchema>;
export type BusFactorFile = z.infer<typeof busFactorFileSchema>;
