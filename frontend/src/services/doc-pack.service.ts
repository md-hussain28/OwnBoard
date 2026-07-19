import { API_ENDPOINTS, getApiClient, isNotFoundError, performSignedUpload } from "@/lib/api";
import {
  type AdminQuizTemplate,
  type AudiencePreview,
  adminQuizTemplateSchema,
  audiencePreviewSchema,
  type DocPack,
  type DocPackDocument,
  type DocPackIngestStatus,
  type DocPackListItem,
  docPackDocumentListSchema,
  docPackDocumentSchema,
  docPackIngestStatusSchema,
  docPackListSchema,
  docPackSchema,
  type GenerateDocPackQuizResponse,
  generateDocPackQuizResponseSchema,
  type QuizQuestionCurationItem,
} from "@/schemas";

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
    assign_to_all?: boolean;
    audience_domain_ids?: string[];
    sequence_order?: number;
    estimated_minutes?: number | null;
    due_offset_days?: number | null;
  }): Promise<DocPack> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPacks, input);
    return docPackSchema.parse(data);
  },

  async update(
    id: string,
    input: {
      name?: string;
      description?: string;
      domain_id?: string | null;
      assign_to_all?: boolean;
      audience_domain_ids?: string[];
      sequence_order?: number;
      estimated_minutes?: number | null;
      due_offset_days?: number | null;
    },
  ): Promise<DocPack> {
    const { data } = await getApiClient().patch(API_ENDPOINTS.docPack(id), input);
    return docPackSchema.parse(data);
  },

  /** Dry-run: how many employees a given audience selection would resolve to. */
  async audiencePreview(input: {
    assign_to_all: boolean;
    audience_domain_ids: string[];
  }): Promise<AudiencePreview> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackAudiencePreview, input);
    return audiencePreviewSchema.parse(data);
  },

  /**
   * Upload PDFs straight to Supabase Storage via signed URLs, then register them. The bytes never
   * transit the Next.js/Vercel proxy, so uploads up to the size limit in lib/upload.ts work (a proxied multipart POST
   * would 413 at Vercel's ~4.5MB serverless body cap).
   */
  async uploadDocuments(
    id: string,
    files: File[],
    options?: { onUploadProgress?: (percent: number) => void },
  ): Promise<DocPackDocument[]> {
    const data = await performSignedUpload({
      urlsEndpoint: API_ENDPOINTS.docPackDocumentUploadUrls(id),
      registerEndpoint: API_ENDPOINTS.docPackDocumentsRegister(id),
      files,
      onProgress: options?.onUploadProgress,
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

  /** Re-queue a failed document for ingestion; returns the document flipped to `processing`. */
  async retryDocument(id: string, documentId: string): Promise<DocPackDocument> {
    const { data } = await getApiClient().post(API_ENDPOINTS.docPackDocumentRetry(id, documentId));
    return docPackDocumentSchema.parse(data);
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
    passPct = 100,
  ): Promise<AdminQuizTemplate> {
    const { data } = await getApiClient().put(API_ENDPOINTS.docPackQuiz(id), {
      questions,
      open_book: openBook,
      pass_pct: passPct,
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
