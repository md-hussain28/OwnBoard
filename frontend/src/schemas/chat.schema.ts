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
