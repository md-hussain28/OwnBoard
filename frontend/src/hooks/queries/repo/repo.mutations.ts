import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repoService } from "@/services/repo.service";
import { repoKeys } from "@/hooks/queries/repo/repo.queries";
import type { CreateRepoInput } from "@/schemas/repo.schema";

export function useCreateRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRepoInput) => repoService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
