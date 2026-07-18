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
    onMutate: async (input) => {
      // Tag the optimistic row with a client draft id so `onSuccess` can swap in the
      // real backend id. The draft id (`new_…`) can never resolve on the backend, so
      // linking to it before the swap 404s — hence the precise replace below.
      const draftId = typedId(ID_PREFIXES.draft);
      const snapshots = await optimisticEdits(queryClient, [
        cacheEdit<Repo[]>(repoKeys.all, (prev) =>
          prev
            ? [
                ...prev,
                {
                  id: draftId,
                  url: input.url,
                  name: input.name,
                  ingestedAt: null,
                },
              ]
            : prev,
        ),
      ]);
      return { draftId, snapshots };
    },
    onSuccess: (repo, _input, context) => {
      // Replace the draft row with the persisted repo so its card links to the real
      // `repo_…` id immediately, instead of waiting on the `onSettled` refetch.
      queryClient.setQueryData<Repo[]>(repoKeys.all, (prev) =>
        prev?.map((r) => (r.id === context?.draftId ? repo : r)),
      );
    },
    onError: (_err, _input, context) => rollbackEdits(queryClient, context?.snapshots),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
