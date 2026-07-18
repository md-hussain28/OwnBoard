import { z } from "zod";

export const sourceCitationSchema = z.object({
  commitSha: z.string().optional(),
  filePath: z.string().optional(),
  summary: z.string().optional(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sourceCitation: sourceCitationSchema.nullable().optional(),
  confidence: z.enum(["high", "low"]).optional(),
});

export const expertRoutingSchema = z.object({
  contributorName: z.string(),
  evidence: z.string(),
  draftMessage: z.string(),
});

export const chatResponseSchema = z.object({
  message: chatMessageSchema,
  expertRouting: expertRoutingSchema.nullable().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ExpertRouting = z.infer<typeof expertRoutingSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Archaeology Q&A wire shape (POST /repos/:id/chat/ask) — grounded answer, cited, with escalation.
export const archaeologyCitationSchema = z
  .object({
    file_path: z.string().optional(),
    commit_sha: z.string().nullable().optional(),
    summary: z.string().optional(),
  })
  .transform((r) => ({
    filePath: r.file_path ?? "",
    commitSha: r.commit_sha ?? null,
    summary: r.summary ?? "",
  }));

export const archaeologyExpertSchema = z
  .object({
    contributor_name: z.string(),
    evidence: z.array(z.string()).default([]),
    draft_message: z.string().nullable().optional(),
  })
  .transform((r) => ({
    contributorName: r.contributor_name,
    evidence: r.evidence,
    draftMessage: r.draft_message ?? null,
  }));

export const answerResponseSchema = z
  .object({
    answer: z.string(),
    citations: z.array(archaeologyCitationSchema).default([]),
    confidence: z.number(),
    escalated: z.boolean().default(false),
    expert: archaeologyExpertSchema.nullable().optional(),
  })
  .transform((r) => ({
    answer: r.answer,
    citations: r.citations,
    confidence: r.confidence,
    escalated: r.escalated,
    expert: r.expert ?? null,
  }));

export type ArchaeologyCitation = z.infer<typeof archaeologyCitationSchema>;
export type AnswerResponse = z.infer<typeof answerResponseSchema>;
