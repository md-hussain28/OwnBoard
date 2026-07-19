import { useQuery } from "@tanstack/react-query";
import { isDraftId } from "@/lib";
import { expertService } from "@/services";

export const expertKeys = {
  all: ["experts"] as const,
  forFile: (repoId: string, filePath: string) => ["experts", repoId, filePath] as const,
};

export function useExperts() {
  return useQuery({
    queryKey: expertKeys.all,
    queryFn: expertService.list,
  });
}

/** Look up the routed expert for a file. Enabled only once a file path has been entered. */
export function useExpertForFile(repoId: string, filePath: string) {
  return useQuery({
    queryKey: expertKeys.forFile(repoId, filePath),
    queryFn: () => expertService.routeToExpert(repoId, filePath),
    // `!isDraftId`: the repos cache can briefly hold an optimistic `new_…` row.
    enabled: Boolean(repoId && filePath) && !isDraftId(repoId),
    retry: false,
  });
}
