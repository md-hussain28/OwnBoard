import { useQuery } from "@tanstack/react-query";
import { isDraftId } from "@/lib";
import { skillGraphService } from "@/services";

export const skillGraphKeys = {
  expertise: (repoId: string) => ["skill-graph", "expertise", repoId] as const,
  busFactor: (repoId: string) => ["skill-graph", "bus-factor", repoId] as const,
};

// `!isDraftId`: callers pass ids straight from the repos cache, which can briefly hold an
// optimistic `new_…` row — the backend can't resolve it, so don't fetch until it's real.

export function useExpertiseScores(repoId: string) {
  return useQuery({
    queryKey: skillGraphKeys.expertise(repoId),
    queryFn: () => skillGraphService.expertise(repoId),
    enabled: Boolean(repoId) && !isDraftId(repoId),
  });
}

export function useSkillGraphBusFactor(repoId: string) {
  return useQuery({
    queryKey: skillGraphKeys.busFactor(repoId),
    queryFn: () => skillGraphService.busFactor(repoId),
    enabled: Boolean(repoId) && !isDraftId(repoId),
  });
}
