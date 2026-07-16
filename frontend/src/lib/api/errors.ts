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

/** Backend error envelope (`exception_handlers.py`): `{ error: "ValidationError", message: "..." }`.
 * The proxy's backend-unreachable shape is `{ error: "Backend unreachable", detail: "..." }`. */
type ApiErrorBody = { message?: unknown; detail?: unknown; error?: unknown };

/**
 * The one way to turn an API error into user-facing text. Prefers the backend's `message`
 * over axios's generic "Request failed with status code NNN".
 */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (typeof body?.message === "string" && body.message) return body.message;
    if (typeof body?.detail === "string" && body.detail) return body.detail;
    if (error.response?.status === 503) return "The backend is unreachable — please try again shortly.";
    if (error.code === "ECONNABORTED") return "The request timed out. Please try again.";
    if (error.response?.status) return `${fallback} (HTTP ${error.response.status})`;
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
