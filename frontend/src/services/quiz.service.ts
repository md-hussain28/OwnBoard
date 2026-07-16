import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  quizTemplateListSchema,
  quizTemplateSchema,
  quizAttemptSchema,
  type QuizAttempt,
  type QuizTemplate,
} from "@/schemas/quiz.schema";

export const quizService = {
  async listTemplates(): Promise<QuizTemplate[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.quizTemplates);
    return quizTemplateListSchema.parse(data);
  },

  async getTemplate(id: string): Promise<QuizTemplate> {
    const { data } = await getApiClient().get(API_ENDPOINTS.quizTemplate(id));
    return quizTemplateSchema.parse(data);
  },

  async submitAttempt(input: {
    quizTemplateId: string;
    employeeId: string;
    answers: number[];
  }): Promise<QuizAttempt> {
    const { data } = await getApiClient().post(API_ENDPOINTS.quizAttempts, input);
    return quizAttemptSchema.parse(data);
  },
};
