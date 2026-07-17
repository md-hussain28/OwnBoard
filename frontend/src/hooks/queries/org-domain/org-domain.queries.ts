import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeeKeys } from "@/hooks/queries/employee/employee.queries";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries/optimistic";
import type {
  CreateOrgDomainInput,
  OrgDomain,
  UpdateOrgDomainInput,
} from "@/schemas/org-domain.schema";
import { orgDomainService } from "@/services/org-domain.service";

export const orgDomainKeys = {
  all: ["org-domains"] as const,
};

export function useOrgDomains(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: orgDomainKeys.all,
    queryFn: orgDomainService.list,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateOrgDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrgDomainInput) => orgDomainService.create(input),
    onSuccess: (domain) => {
      queryClient.setQueryData<OrgDomain[]>(orgDomainKeys.all, (prev) =>
        prev ? [...prev, domain] : [domain],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
    },
  });
}

export function useUpdateOrgDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrgDomainInput }) =>
      orgDomainService.update(id, input),
    onMutate: async ({ id, input }) => {
      const snapshot = await optimisticUpdate<OrgDomain[]>(queryClient, orgDomainKeys.all, (prev) =>
        prev?.map((d) => (d.id === id ? { ...d, ...input } : d)),
      );
      return snapshot;
    },
    onError: (_err, _vars, context) => {
      rollbackOptimistic(queryClient, orgDomainKeys.all, context);
    },
    onSuccess: (domain) => {
      queryClient.setQueryData<OrgDomain[]>(orgDomainKeys.all, (prev) =>
        prev?.map((d) => (d.id === domain.id ? domain : d)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

export function useDeleteOrgDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgDomainService.remove(id),
    onMutate: async (id) => {
      const snapshot = await optimisticUpdate<OrgDomain[]>(queryClient, orgDomainKeys.all, (prev) =>
        prev?.filter((d) => d.id !== id),
      );
      return snapshot;
    },
    onError: (_err, _id, context) => {
      rollbackOptimistic(queryClient, orgDomainKeys.all, context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
      void queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
