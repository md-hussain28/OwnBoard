import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingestKeyKeys } from "@/hooks/queries/ingest-key/ingest-key.queries";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries/optimistic";
import type { IngestKey } from "@/schemas/ingest-key.schema";
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
    onMutate: (keyId) => {
      const revokedAt = new Date().toISOString();
      return optimisticEdits(queryClient, [
        cacheEdit<IngestKey[]>(ingestKeyKeys.all(repoId), (prev) =>
          prev?.map((k) => (k.id === keyId ? { ...k, revokedAt: k.revokedAt ?? revokedAt } : k)),
        ),
      ]);
    },
    onError: (_err, _keyId, context) => rollbackEdits(queryClient, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ingestKeyKeys.all(repoId) });
    },
  });
}
