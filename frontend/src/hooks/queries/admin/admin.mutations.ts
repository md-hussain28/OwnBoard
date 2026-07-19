import { useMutation, useQueryClient } from "@tanstack/react-query";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries";
import { ID_PREFIXES, isDraftId, typedId } from "@/lib";
import type { CreateTenantInput, Tenant } from "@/schemas";
import { adminService } from "@/services";
import { adminKeys } from "./admin.queries";

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantInput) => adminService.createTenant(input),
    onMutate: async (input) => {
      const snap = await optimisticUpdate<Tenant[]>(queryClient, adminKeys.tenants(), (prev) => {
        const optimistic: Tenant = {
          id: typedId(ID_PREFIXES.draft),
          name: input.name,
          slug: input.slug ?? null,
          membersCount: 0,
          createdAt: new Date().toISOString(),
        };
        return prev ? [optimistic, ...prev] : [optimistic];
      });
      return snap;
    },
    onError: (_err, _input, context) => {
      rollbackOptimistic(queryClient, adminKeys.tenants(), context);
    },
    onSuccess: (created) => {
      const tenant: Tenant = {
        id: created.id,
        name: created.name,
        slug: created.slug,
        membersCount: created.membersCount,
        createdAt: created.createdAt,
      };
      queryClient.setQueryData<Tenant[]>(adminKeys.tenants(), (prev) => {
        const rest = prev?.filter((t) => t.id !== tenant.id && !isDraftId(t.id)) ?? [];
        return [tenant, ...rest];
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants() });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminService.deleteTenant(id),
    onMutate: async (id) => {
      const snapshot = await optimisticUpdate<Tenant[]>(queryClient, adminKeys.tenants(), (prev) =>
        prev?.filter((t) => t.id !== id),
      );
      return snapshot;
    },
    onError: (_err, _id, context) => {
      rollbackOptimistic(queryClient, adminKeys.tenants(), context);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.tenants() });
    },
  });
}
