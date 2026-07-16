import { z } from "zod";

export const busFactorEntrySchema = z.object({
  subsystem: z.string(),
  topContributorShare: z.number(),
  riskLevel: z.enum(["low", "medium", "high"]),
});

export const quizAnalyticsSchema = z.object({
  passRate: z.number(),
  commonFailurePoints: z.array(z.string()),
});

export const busFactorListSchema = z.array(busFactorEntrySchema);

export type BusFactorEntry = z.infer<typeof busFactorEntrySchema>;
export type QuizAnalytics = z.infer<typeof quizAnalyticsSchema>;
