import { useQuery } from "@tanstack/react-query";
import { docPackService } from "@/services/doc-pack.service";

export const docPackKeys = {
  all: ["doc-packs"] as const,
  detail: (id: string) => ["doc-packs", id] as const,
  quiz: (id: string) => ["doc-packs", id, "quiz"] as const,
  assignments: (id: string) => ["doc-packs", id, "assignments"] as const,
};

export function useDocPacks() {
  return useQuery({
    queryKey: docPackKeys.all,
    queryFn: docPackService.list,
  });
}

export function useDocPack(id: string) {
  return useQuery({
    queryKey: docPackKeys.detail(id),
    queryFn: () => docPackService.get(id),
    enabled: Boolean(id),
    // Poll while documents are still `uploaded`/`processing` so per-file status stays live.
    refetchInterval: (query) => {
      const documents = query.state.data?.documents ?? [];
      const stillIngesting = documents.some(
        (d) => d.status === "uploaded" || d.status === "processing",
      );
      return stillIngesting ? 3000 : false;
    },
  });
}

export function useDocPackQuiz(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: docPackKeys.quiz(id),
    queryFn: () => docPackService.getQuiz(id),
    enabled: (options?.enabled ?? true) && Boolean(id),
    retry: false, // 404 just means "no quiz generated yet"
  });
}
