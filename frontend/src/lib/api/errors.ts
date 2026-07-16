import { isAxiosError } from "axios";

/** True when the backend answered 501 — the domain's service method is `raise NotImplementedError(...)`
 * (see backend/CLAUDE.md's "Stub-first convention"), not a real failure. */
export function isNotImplementedError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 501;
}

/** True when the resource genuinely isn't there (or hasn't been created yet). */
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}
