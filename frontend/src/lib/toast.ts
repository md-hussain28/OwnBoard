import { type ExternalToast, toast as sonnerToast } from "sonner";
import { getApiErrorMessage, isNotImplementedError } from "@/lib/api/errors";

const MAX_DESCRIPTION_LENGTH = 180;
const SUCCESS_DURATION_MS = 4000;
const ERROR_DURATION_MS = 6000;
const WARNING_DURATION_MS = 5500;
const INFO_DURATION_MS = 4500;

export type NotifyOptions = Omit<ExternalToast, "description"> & {
  description?: string;
};

function truncate(text: string, max = MAX_DESCRIPTION_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function normalizeTitle(title: string): string | null {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function withDescription(options?: NotifyOptions): ExternalToast | undefined {
  if (!options) return undefined;
  const { description, ...rest } = options;
  if (description === undefined) return rest;
  const truncated = truncate(description);
  if (!truncated) return rest;
  return { ...rest, description: truncated };
}

function base(kindDuration: number, options?: NotifyOptions): ExternalToast {
  return {
    duration: kindDuration,
    ...withDescription(options),
  };
}

/**
 * Single entry point for app toasts. Prefer this over importing `sonner` directly
 * so durations, truncation, and API-error handling stay consistent.
 */
export const notify = {
  success(title: string, options?: NotifyOptions) {
    const text = normalizeTitle(title);
    if (!text) return;
    return sonnerToast.success(text, base(SUCCESS_DURATION_MS, options));
  },

  error(title: string, options?: NotifyOptions) {
    const text = normalizeTitle(title);
    if (!text) return;
    return sonnerToast.error(text, base(ERROR_DURATION_MS, options));
  },

  warning(title: string, options?: NotifyOptions) {
    const text = normalizeTitle(title);
    if (!text) return;
    return sonnerToast.warning(text, base(WARNING_DURATION_MS, options));
  },

  info(title: string, options?: NotifyOptions) {
    const text = normalizeTitle(title);
    if (!text) return;
    return sonnerToast.info(text, base(INFO_DURATION_MS, options));
  },

  /**
   * Turn an API failure into an error toast. No-ops for empty titles.
   * Skips 501 NotImplemented when `skipNotImplemented` is true (default) —
   * those surfaces already show IncomingBadge / in-thread copy.
   */
  apiError(
    error: unknown,
    fallback = "Something went wrong. Please try again.",
    options?: NotifyOptions & { skipNotImplemented?: boolean },
  ) {
    const { skipNotImplemented = true, ...toastOptions } = options ?? {};
    if (skipNotImplemented && isNotImplementedError(error)) return;

    const message = getApiErrorMessage(error, fallback);
    return notify.error(message, {
      id: toastOptions.id ?? `api-error:${message}`,
      ...toastOptions,
    });
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
    options?: NotifyOptions,
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) => (typeof messages.error === "function" ? messages.error(err) : messages.error),
      ...withDescription(options),
    });
  },

  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};
