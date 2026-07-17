import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/hooks/queries/admin/admin.queries";
import { optimisticUpdate, rollbackOptimistic } from "@/hooks/queries/optimistic";
import type { CreateTenantInput, Tenant } from "@/schemas/admin.schema";
import { adminService } from "@/services/admin.service";

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantInput) => adminService.createTenant(input),
    onSuccess: (created) => {
      const tenant: Tenant = {
        id: created.id,
        name: created.name,
        slug: created.slug,
        membersCount: created.membersCount,
        createdAt: created.createdAt,
      };
      queryClient.setQueryData<Tenant[]>(adminKeys.tenants(), (prev) =>
        prev ? [tenant, ...prev.filter((t) => t.id !== tenant.id)] : [tenant],
      );
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
