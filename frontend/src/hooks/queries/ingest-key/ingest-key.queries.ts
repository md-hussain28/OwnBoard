import { useQuery } from "@tanstack/react-query";
import { ingestKeyService } from "@/services/ingest-key.service";

export const ingestKeyKeys = {
  all: (repoId: string) => ["ingest-keys", repoId] as const,
};

export function useIngestKeys(repoId: string) {
  return useQuery({
    queryKey: ingestKeyKeys.all(repoId),
    queryFn: () => ingestKeyService.list(repoId),
    enabled: Boolean(repoId),
  });
}
