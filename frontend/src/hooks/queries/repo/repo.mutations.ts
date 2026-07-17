import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repoKeys } from "@/hooks/queries/repo/repo.queries";
import type { CreateRepoInput } from "@/schemas/repo.schema";
import { repoService } from "@/services/repo.service";

export function useCreateRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRepoInput) => repoService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
