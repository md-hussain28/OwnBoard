import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";

export const adminKeys = {
  all: ["admin"] as const,
  me: () => [...adminKeys.all, "me"] as const,
  tenants: () => [...adminKeys.all, "tenants"] as const,
};

export function usePlatformAdminMe() {
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: adminKeys.me(),
    queryFn: () => adminService.me(),
    enabled: Boolean(isSignedIn),
    staleTime: 60_000,
  });
}

export function useTenants() {
  return useQuery({
    queryKey: adminKeys.tenants(),
    queryFn: () => adminService.listTenants(),
  });
}
