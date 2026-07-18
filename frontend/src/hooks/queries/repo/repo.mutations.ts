import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cacheEdit, optimisticEdits, rollbackEdits } from "@/hooks/queries";
import { ID_PREFIXES, typedId } from "@/lib";
import type { CreateRepoInput, Repo } from "@/schemas";
import { repoService } from "@/services";
import { repoKeys } from "./repo.queries";

export function useCreateRepo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRepoInput) => repoService.create(input),
    onMutate: (input) =>
      optimisticEdits(queryClient, [
        cacheEdit<Repo[]>(repoKeys.all, (prev) =>
          prev
            ? [
                ...prev,
                {
                  id: typedId(ID_PREFIXES.draft),
                  url: input.url,
                  name: input.name,
                  ingestedAt: null,
                },
              ]
            : prev,
        ),
      ]),
    onError: (_err, _input, context) => rollbackEdits(queryClient, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
