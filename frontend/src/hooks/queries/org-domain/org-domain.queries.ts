import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgDomainService } from "@/services/org-domain.service";
import type { CreateOrgDomainInput, UpdateOrgDomainInput } from "@/schemas/org-domain.schema";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
    },
  });
}

export function useUpdateOrgDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateOrgDomainInput }) =>
      orgDomainService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteOrgDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => orgDomainService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgDomainKeys.all });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
