import { useQuery } from "@tanstack/react-query";
import { docPackService } from "@/services/doc-pack.service";

export const docPackKeys = {
  all: ["doc-packs"] as const,
  detail: (id: string) => ["doc-packs", id] as const,
  quiz: (id: string) => ["doc-packs", id, "quiz"] as const,
  assignments: (id: string) => ["doc-packs", id, "assignments"] as const,
  ingestStatus: (id: string) => ["doc-packs", id, "ingest-status"] as const,
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
    // No refetchInterval here: live per-file progress comes from the cheap
    // `useDocPackIngestStatus` poll — re-fetching the whole pack every few seconds
    // is too heavy for the backend.
  });
}

/** Polls the lightweight status endpoint while any document is still queued/processing. */
export function useDocPackIngestStatus(id: string, enabled = true) {
  return useQuery({
    queryKey: docPackKeys.ingestStatus(id),
    queryFn: () => docPackService.getIngestStatus(id),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (!status) return 4000; // first fetch pending/failed — keep trying while enabled
      return status.isComplete ? false : 4000;
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
