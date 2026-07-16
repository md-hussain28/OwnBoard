import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import {
  docPackDocumentListSchema,
  docPackListSchema,
  docPackSchema,
  type DocPack,
  type DocPackDocument,
  type DocPackListItem,
} from "@/schemas/docPack.schema";
import {
  adminQuizTemplateSchema,
  generateDocPackQuizResponseSchema,
  type AdminQuizTemplate,
  type GenerateDocPackQuizResponse,
  type QuizQuestionCurationItem,
} from "@/schemas/quiz.schema";

export const docPackService = {
  async list(): Promise<DocPackListItem[]> {
    const { data } = await getApiClient().get(API_ENDPOINTS.docPacks);
    return docPackListSchema.parse(data);
  },

  async get(id: string): Promise<DocPack> {
    const { data } = await getApiClient().get(API_ENDPOINTS.docPack(id));
    return docPackSchema.parse(data);
  },

  async create(input: { name: string; description?: string }): Promise<DocPack> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPacks, input);
    return docPackSchema.parse(data);
  },

  async update(id: string, input: { name?: string; description?: string }): Promise<DocPack> {
    const { data } = await getApiClient().patch(API_ENDPOINTS.docPack(id), input);
    return docPackSchema.parse(data);
  },

  async uploadDocuments(id: string, files: File[]): Promise<DocPackDocument[]> {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackDocuments(id), form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return docPackDocumentListSchema.parse(data);
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.docPackDocument(id, documentId));
  },

  async generateQuiz(
    id: string,
    input: { target_count: number; formats: ("mcq_4" | "true_false")[]; custom_instructions?: string },
  ): Promise<GenerateDocPackQuizResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackGenerateQuiz(id), input, {
      timeout: 300_000, // multi-step LLM pipeline — much slower than a CRUD call
    });
    return generateDocPackQuizResponseSchema.parse(data);
  },

  async getQuiz(id: string): Promise<AdminQuizTemplate> {
    const { data } = await getApiClient().get(API_ENDPOINTS.docPackQuiz(id));
    return adminQuizTemplateSchema.parse(data);
  },

  async saveQuiz(id: string, questions: QuizQuestionCurationItem[]): Promise<AdminQuizTemplate> {
    const { data } = await getApiClient().put(API_ENDPOINTS.docPackQuiz(id), { questions });
    return adminQuizTemplateSchema.parse(data);
  },

  async regenerateQuestions(id: string, questionIds: string[]): Promise<AdminQuizTemplate> {
    const { data } = await getApiClient().post(
      API_ENDPOINTS.docPackRegenerateQuestions(id),
      { question_ids: questionIds },
      { timeout: 300_000 },
    );
    return adminQuizTemplateSchema.parse(data);
  },
};
