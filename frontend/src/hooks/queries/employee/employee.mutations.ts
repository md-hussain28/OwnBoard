import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeService } from "@/services/employee.service";
import { employeeKeys } from "@/hooks/queries/employee/employee.queries";
import type { InviteEmployeeInput, UpdateEmployeeInput } from "@/schemas/employee.schema";

export function useInviteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteEmployeeInput) => employeeService.invite(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      employeeService.update(id, input),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(employee.id) });
    },
  });
}
