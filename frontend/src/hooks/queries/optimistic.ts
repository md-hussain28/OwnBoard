import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type OptimisticSnapshot<T> = {
  previous: T | undefined;
};

/** Cancel in-flight fetches, snapshot cache, apply updater. Pair with `rollbackOptimistic` + `onSettled` invalidate. */
export async function optimisticUpdate<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (previous: T | undefined) => T | undefined,
): Promise<OptimisticSnapshot<T>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, updater(previous));
  return { previous };
}

export function rollbackOptimistic<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  snapshot: OptimisticSnapshot<T> | undefined,
) {
  if (!snapshot) return;
  queryClient.setQueryData(queryKey, snapshot.previous);
}
