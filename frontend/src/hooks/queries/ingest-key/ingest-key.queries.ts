import { useQuery } from "@tanstack/react-query";
import { ingestKeyService } from "@/services";

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
