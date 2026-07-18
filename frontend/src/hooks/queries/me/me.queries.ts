import { useQuery } from "@tanstack/react-query";
import { meService } from "@/services";

export const meKeys = {
  all: ["me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: meKeys.all,
    queryFn: meService.get,
    staleTime: 30_000,
  });
}

/** OwnBoard app_role for the active org member (null while loading / no org). */
export function useAppRole() {
  const { data, isLoading, isError } = useMe();
  return {
    appRole: data?.appRole ?? null,
    employeeId: data?.employeeId ?? null,
    isAdmin: data?.appRole === "admin",
    isLoading,
    isError,
  };
}
