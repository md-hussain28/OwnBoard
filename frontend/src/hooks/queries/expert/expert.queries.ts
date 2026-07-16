import { useQuery } from "@tanstack/react-query";
import { expertService } from "@/services/expert.service";

export const expertKeys = {
  all: ["experts"] as const,
};

export function useExperts() {
  return useQuery({
    queryKey: expertKeys.all,
    queryFn: expertService.list,
  });
}
