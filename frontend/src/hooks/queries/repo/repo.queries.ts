import { useQuery } from "@tanstack/react-query";
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
    enabled: Boolean(id),
  });
}
