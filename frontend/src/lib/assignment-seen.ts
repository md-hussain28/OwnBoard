const STORAGE_PREFIX = "ownboard:seen-assignments:";

function storageKey(employeeId: string) {
  return `${STORAGE_PREFIX}${employeeId}`;
}

function readIds(employeeId: string): Set<string> {
  if (typeof window === "undefined" || !employeeId) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(employeeId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeIds(employeeId: string, ids: Set<string>) {
  if (typeof window === "undefined" || !employeeId) return;
  try {
    window.localStorage.setItem(storageKey(employeeId), JSON.stringify([...ids]));
  } catch {
    // ignore quota / private mode failures
  }
}

/** Assignment IDs this employee has already acknowledged in the notification inbox. */
export function getSeenAssignmentIds(employeeId: string): Set<string> {
  return readIds(employeeId);
}

export function markAssignmentsSeen(employeeId: string, assignmentIds: string[]) {
  if (!employeeId || assignmentIds.length === 0) return;
  const next = readIds(employeeId);
  for (const id of assignmentIds) next.add(id);
  writeIds(employeeId, next);
}

/**
 * First visit: treat in-progress / completed work as already seen so a returning
 * session doesn't spam the badge — but leave status === "assigned" unseen so a
 * brand-new pack still lights up the bell.
 */
export function seedSeenAssignmentsIfEmpty(
  employeeId: string,
  assignments: { id: string; status: string }[],
) {
  if (!employeeId || typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(storageKey(employeeId)) !== null) return false;
  } catch {
    return false;
  }
  const alreadyKnown = assignments.filter((a) => a.status !== "assigned").map((a) => a.id);
  writeIds(employeeId, new Set(alreadyKnown));
  return true;
}
