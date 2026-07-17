const STORAGE_PREFIX = "ownboard:seen-outcomes:";

function storageKey(employeeId: string) {
  return `${STORAGE_PREFIX}${employeeId}`;
}

/** Stable key so a fail→pass (or re-grade) can light the badge again. */
export function outcomeSeenKey(outcome: { id: string; status: string; updatedAt: string }) {
  return `${outcome.id}:${outcome.status}:${outcome.updatedAt}`;
}

function readKeys(employeeId: string): Set<string> {
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

function writeKeys(employeeId: string, keys: Set<string>) {
  if (typeof window === "undefined" || !employeeId) return;
  try {
    window.localStorage.setItem(storageKey(employeeId), JSON.stringify([...keys]));
  } catch {
    // ignore quota / private mode failures
  }
}

export function getSeenOutcomeKeys(employeeId: string): Set<string> {
  return readKeys(employeeId);
}

export function markOutcomesSeen(employeeId: string, keys: string[]) {
  if (!employeeId || keys.length === 0) return;
  const next = readKeys(employeeId);
  for (const key of keys) next.add(key);
  writeKeys(employeeId, next);
}

/**
 * First visit: treat existing outcomes as already seen so opening the app
 * doesn't dump a historical badge — new grades after that still light up.
 */
export function seedSeenOutcomesIfEmpty(
  employeeId: string,
  outcomes: { id: string; status: string; updatedAt: string }[],
) {
  if (!employeeId || typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(storageKey(employeeId)) !== null) return false;
  } catch {
    return false;
  }
  writeKeys(employeeId, new Set(outcomes.map(outcomeSeenKey)));
  return true;
}
