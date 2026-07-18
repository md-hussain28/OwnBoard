import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestKeyKeys } from "@/hooks/queries/ingest-key/ingest-key.queries";
import { ingestKeyService } from "@/services/ingest-key.service";

export function useCreateIngestKey(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ingestKeyService.create(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingestKeyKeys.all(repoId) });
    },
  });
}

export function useRevokeIngestKey(repoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => ingestKeyService.revoke(repoId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingestKeyKeys.all(repoId) });
    },
  });
}
