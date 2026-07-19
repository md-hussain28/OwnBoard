/**
 * Per-feature "already saw the page nudge" memory, shared by the registrar that
 * requests a page nudge (`components/tour/page-tour-nudge.tsx`) and the launcher
 * that renders it (`components/tour/tour-trigger.tsx`).
 *
 * Bumped when a page's nudge copy/target changes materially, so a returning user
 * who already dismissed it is offered the refreshed walkthrough once more.
 */
const NUDGE_VERSION = "v1";
const dismissKey = (featureId: string) => `ownboard:tour:page-nudge:${NUDGE_VERSION}:${featureId}`;

export function wasNudgeDismissed(featureId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(dismissKey(featureId)) === "1";
  } catch {
    return true; // storage blocked (private mode) — don't nag on every load
  }
}

export function markNudgeDismissed(featureId: string): void {
  try {
    window.localStorage.setItem(dismissKey(featureId), "1");
  } catch {
    // ignore — best-effort persistence
  }
}
