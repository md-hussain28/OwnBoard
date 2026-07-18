import { useQuery } from "@tanstack/react-query";
import { projectDocContentService } from "@/services/project-doc-content.service";

export const askKeys = {
  docContent: (projectId: string, documentId: string) =>
    ["projects", projectId, "docs", documentId, "content"] as const,
};

/** Loads a project document's extracted text for the citation viewer. Enabled only when open. */
export function useProjectDocContent(
  projectId: string,
  documentId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: askKeys.docContent(projectId, documentId ?? "none"),
    queryFn: () => projectDocContentService.get(projectId, documentId as string),
    enabled: enabled && !!projectId && !!documentId,
    staleTime: 5 * 60 * 1000,
  });
}
