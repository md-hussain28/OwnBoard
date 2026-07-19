import { useQuery } from "@tanstack/react-query";
import { isDraftId } from "@/lib";
import { repoService } from "@/services";

export const repoKeys = {
  all: ["repos"] as const,
  detail: (id: string) => ["repos", id] as const,
};

export function useRepos() {
  return useQuery({
    queryKey: repoKeys.all,
    queryFn: repoService.list,
  });
}

export function useRepo(id: string) {
  return useQuery({
    queryKey: repoKeys.detail(id),
    queryFn: () => repoService.get(id),
    // `!isDraftId`: an optimistic `new_…` id from the repos cache has no backend record yet.
    enabled: Boolean(id) && !isDraftId(id),
  });
}
