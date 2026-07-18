import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services";

export const dashboardKeys = {
  busFactor: (repoId: string) => ["dashboard", "bus-factor", repoId] as const,
  quizAnalytics: (repoId: string) => ["dashboard", "quiz-analytics", repoId] as const,
};

export function useBusFactor(repoId: string) {
  return useQuery({
    queryKey: dashboardKeys.busFactor(repoId),
    queryFn: () => dashboardService.getBusFactor(repoId),
    enabled: Boolean(repoId),
  });
}

export function useQuizAnalytics(repoId: string) {
  return useQuery({
    queryKey: dashboardKeys.quizAnalytics(repoId),
    queryFn: () => dashboardService.getQuizAnalytics(repoId),
    enabled: Boolean(repoId),
  });
}
