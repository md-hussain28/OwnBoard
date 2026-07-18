import { z } from "zod";

/** Response of `GET /repos/:id/experts?file_path=…` — the routed primary expert + evidence. */
export const expertReferralSchema = z
  .object({
    contributor_id: z.string(),
    contributor_name: z.string(),
    confidence: z.number(),
    evidence: z.array(z.string()).default([]),
    draft_message: z.string().nullable().optional(),
    backup_contributor_name: z.string().nullable().optional(),
  })
  .transform((r) => ({
    contributorId: r.contributor_id,
    contributorName: r.contributor_name,
    confidence: r.confidence,
    evidence: r.evidence,
    draftMessage: r.draft_message ?? null,
    backupContributorName: r.backup_contributor_name ?? null,
  }));

export type ExpertReferral = z.infer<typeof expertReferralSchema>;
