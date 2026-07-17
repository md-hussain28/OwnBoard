import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { isNotFoundError } from "@/lib/api/errors";
import {
  type DocPack,
  type DocPackDocument,
  type DocPackIngestStatus,
  type DocPackListItem,
  docPackDocumentListSchema,
  docPackIngestStatusSchema,
  docPackListSchema,
  docPackSchema,
} from "@/schemas/docPack.schema";
import {
  type AdminQuizTemplate,
  adminQuizTemplateSchema,
  type GenerateDocPackQuizResponse,
  generateDocPackQuizResponseSchema,
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

  async create(input: {
    name: string;
    description?: string;
    domain_id?: string | null;
  }): Promise<DocPack> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPacks, input);
    return docPackSchema.parse(data);
  },

  async update(
    id: string,
    input: { name?: string; description?: string; domain_id?: string | null },
  ): Promise<DocPack> {
    const { data } = await getApiClient().patch(API_ENDPOINTS.docPack(id), input);
    return docPackSchema.parse(data);
  },

  async uploadDocuments(
    id: string,
    files: File[],
    options?: { onUploadProgress?: (percent: number) => void },
  ): Promise<DocPackDocument[]> {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackDocuments(id), form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
      onUploadProgress: (event) => {
        if (!options?.onUploadProgress || !event.total) return;
        options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return docPackDocumentListSchema.parse(data);
  },

  /** Cheap ingestion-progress poll — column-only query on the backend, safe to call every few seconds. */
  async getIngestStatus(id: string): Promise<DocPackIngestStatus> {
    const { data } = await getApiClient().get(API_ENDPOINTS.docPackDocumentsStatus(id));
    return docPackIngestStatusSchema.parse(data);
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await getApiClient().delete(API_ENDPOINTS.docPackDocument(id, documentId));
  },

  async generateQuiz(
    id: string,
    input: {
      target_count: number;
      formats: ("mcq_4" | "true_false")[];
      custom_instructions?: string;
    },
  ): Promise<GenerateDocPackQuizResponse> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackGenerateQuiz(id), input, {
      timeout: 300_000, // multi-step LLM pipeline — much slower than a CRUD call
    });
    return generateDocPackQuizResponseSchema.parse(data);
  },

  /** Latest quiz for the pack, or `null` when none has been generated yet (backend 404). */
  async getQuiz(id: string): Promise<AdminQuizTemplate | null> {
    try {
      const { data } = await getApiClient().get(API_ENDPOINTS.docPackQuiz(id));
      return adminQuizTemplateSchema.parse(data);
    } catch (error) {
      if (isNotFoundError(error)) return null;
      throw error;
    }
  },

  async saveQuiz(
    id: string,
    questions: QuizQuestionCurationItem[],
    openBook = false,
  ): Promise<AdminQuizTemplate> {
    const { data } = await getApiClient().put(API_ENDPOINTS.docPackQuiz(id), {
      questions,
      open_book: openBook,
    });
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
