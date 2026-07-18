import { API_ENDPOINTS, getApiClient } from "@/lib/api";
import { type DocContent, docContentSchema } from "@/schemas";

export const projectDocContentService = {
  /** Ordered extracted text for one project document — backs the citation → viewer sheet. */
  async get(projectId: string, documentId: string): Promise<DocContent> {
    const { data } = await getApiClient().get(
      API_ENDPOINTS.projectDocContent(projectId, documentId),
    );
    return docContentSchema.parse(data);
  },
};
