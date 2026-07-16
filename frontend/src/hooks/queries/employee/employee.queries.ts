import { useQuery } from "@tanstack/react-query";
import { employeeService } from "@/services/employee.service";

export const employeeKeys = {
  all: ["employees"] as const,
  detail: (id: string) => ["employees", id] as const,
};

export function useEmployees() {
  return useQuery({
    queryKey: employeeKeys.all,
    queryFn: employeeService.list,
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.get(id),
    enabled: Boolean(id),
  });
}
