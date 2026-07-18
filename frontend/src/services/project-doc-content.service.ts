import { getApiClient } from "@/lib/api/api-client";
import { API_ENDPOINTS } from "@/lib/api/endpoint";
import { type DocContent, docContentSchema } from "@/schemas/project-doc-content.schema";

export const projectDocContentService = {
  /** Ordered extracted text for one project document — backs the citation → viewer sheet. */
  async get(projectId: string, documentId: string): Promise<DocContent> {
    const { data } = await getApiClient().get(
      API_ENDPOINTS.projectDocContent(projectId, documentId),
    );
    return docContentSchema.parse(data);
  },
};
