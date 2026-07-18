import { useQuery } from "@tanstack/react-query";
import { skillGraphService } from "@/services/skill-graph.service";

export const skillGraphKeys = {
  expertise: (repoId: string) => ["skill-graph", "expertise", repoId] as const,
  busFactor: (repoId: string) => ["skill-graph", "bus-factor", repoId] as const,
};

export function useExpertiseScores(repoId: string) {
  return useQuery({
    queryKey: skillGraphKeys.expertise(repoId),
    queryFn: () => skillGraphService.expertise(repoId),
    enabled: Boolean(repoId),
  });
}

export function useSkillGraphBusFactor(repoId: string) {
  return useQuery({
    queryKey: skillGraphKeys.busFactor(repoId),
    queryFn: () => skillGraphService.busFactor(repoId),
    enabled: Boolean(repoId),
  });
}
