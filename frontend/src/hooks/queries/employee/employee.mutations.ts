import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "@/hooks/queries/employee/employee.queries";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries/optimistic";
import type { Employee, InviteEmployeeInput, UpdateEmployeeInput } from "@/schemas/employee.schema";
import { employeeService } from "@/services/employee.service";

export function useInviteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: InviteEmployeeInput) => employeeService.invite(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Applies an update payload to a cached employee — undefined fields keep their current value. */
function withEmployeePatch(employee: Employee, input: UpdateEmployeeInput): Employee {
  return {
    ...employee,
    name: input.name ?? employee.name,
    role: input.role !== undefined ? input.role : employee.role,
    githubHandle: input.githubHandle !== undefined ? input.githubHandle : employee.githubHandle,
    appRole: input.appRole ?? employee.appRole,
    domainId: input.domainId !== undefined ? input.domainId : employee.domainId,
  };
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      employeeService.update(id, input),
    onMutate: async ({ id, input }) => {
      const listSnap = await optimisticUpdate<Employee[]>(queryClient, employeeKeys.all, (prev) =>
        prev?.map((e) => (e.id === id ? withEmployeePatch(e, input) : e)),
      );
      const detailSnap = await optimisticUpdate<Employee>(
        queryClient,
        employeeKeys.detail(id),
        (prev) => (prev ? withEmployeePatch(prev, input) : prev),
      );
      return { listSnap, detailSnap, id };
    },
    onError: (_err, { id }, context) => {
      rollbackOptimistic(queryClient, employeeKeys.all, context?.listSnap);
      rollbackOptimistic(queryClient, employeeKeys.detail(id), context?.detailSnap);
    },
    onSuccess: (employee) => {
      queryClient.setQueryData(employeeKeys.detail(employee.id), employee);
      queryClient.setQueryData<Employee[]>(employeeKeys.all, (prev) =>
        prev?.map((e) => (e.id === employee.id ? employee : e)),
      );
    },
    onSettled: (_data, _err, { id }) => {
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
      void queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
    },
  });
}
