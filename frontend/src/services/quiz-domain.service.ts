import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import {
  type CreateQuizDomainInput,
  type QuizDomain,
  quizDomainListSchema,
  quizDomainSchema,
} from "@/schemas";

export const quizDomainService = {
  async list(): Promise<QuizDomain[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.quizDomains);
    return quizDomainListSchema.parse(data);
  },

  async create(input: CreateQuizDomainInput): Promise<QuizDomain> {
    const { data } = await getApiClient().post(API_ENDPOINTS.quizDomains, { name: input.name });
    return quizDomainSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.quizDomain(id));
  },
};
