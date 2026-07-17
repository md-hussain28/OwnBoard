import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  type BusFactorEntry,
  busFactorListSchema,
  type QuizAnalytics,
  quizAnalyticsSchema,
} from "@/schemas/dashboard.schema";

export const dashboardService = {
  async getBusFactor(repoId: string): Promise<BusFactorEntry[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.dashboardBusFactor(repoId));
    return busFactorListSchema.parse(data);
  },

  async getQuizAnalytics(repoId: string): Promise<QuizAnalytics> {
    const { data } = await getApiClient().get(API_ENDPOINTS.dashboardQuizAnalytics(repoId));
    return quizAnalyticsSchema.parse(data);
  },
};
