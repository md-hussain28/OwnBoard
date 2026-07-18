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

/**
 * A single cache edit: a query key plus a typed updater. Build with `cacheEdit<T>`
 * so the updater stays type-safe while the erased `CacheEdit` can be batched.
 */
export type CacheEdit = {
  key: QueryKey;
  updater: (previous: unknown) => unknown;
};

export type MultiSnapshot = Array<{ key: QueryKey; previous: unknown }>;

/** Type-safe constructor for a `CacheEdit` — pins the cache type at the call site. */
export function cacheEdit<T>(
  key: QueryKey,
  updater: (previous: T | undefined) => T | undefined,
): CacheEdit {
  return { key, updater: (previous) => updater(previous as T | undefined) };
}

/**
 * Apply several optimistic cache edits at once (e.g. a list cache and the detail
 * cache that embeds the same item). Returns a snapshot for every touched key.
 * Pair with `rollbackEdits` in `onError` and an invalidate in `onSettled`.
 */
export async function optimisticEdits(
  queryClient: QueryClient,
  edits: CacheEdit[],
): Promise<MultiSnapshot> {
  const snapshots: MultiSnapshot = [];
  for (const { key, updater } of edits) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData(key);
    queryClient.setQueryData(key, updater(previous));
    snapshots.push({ key, previous });
  }
  return snapshots;
}

export function rollbackEdits(queryClient: QueryClient, snapshots: MultiSnapshot | undefined) {
  if (!snapshots) return;
  for (const { key, previous } of snapshots) {
    queryClient.setQueryData(key, previous);
  }
}
