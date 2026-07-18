import { useQuery } from "@tanstack/react-query";
import { employeeService } from "@/services";

export const employeeKeys = {
  all: ["employees"] as const,
  detail: (id: string) => ["employees", id] as const,
  invitations: ["employees", "invitations"] as const,
};

export function useEmployees(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: employeeService.list,
    enabled: options?.enabled ?? true,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.get(id),
    enabled: Boolean(id),
  });
}

export function usePendingInvitations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: employeeKeys.invitations,
    queryFn: employeeService.listInvitations,
    enabled: options?.enabled ?? true,
  });
}
