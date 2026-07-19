"use client";

import { useEffect } from "react";
import { TOUR_FEATURES, wasNudgeDismissed } from "@/lib/tour";
import { useTourStore } from "@/stores";

/**
 * Registers *this* sub-page's contextual tour nudge.
 *
 * The product already has a spotlight walkthrough (`product-tour.tsx`) and a
 * floating launcher (`tour-trigger.tsx`). This is the contextual counterpart: the
 * first time someone lands on a given sub-page, an offer to run *that page's* slice
 * of the tour appears — but it no longer floats as its own top-of-page banner.
 * Instead it expands as a callout out of the launcher FAB in the bottom-right, so
 * every tour affordance lives in one place.
 *
 * So this component renders nothing itself: on mount it asks the tour store to show
 * the launcher's page nudge for `featureId` (unless already dismissed in this
 * browser), and it retracts that request when the page unmounts. The FAB
 * (`tour-trigger.tsx`) owns the actual callout UI and the "Show me around" / dismiss
 * actions.
 *
 * `featureId` must match a `TOUR_FEATURES` stop id (e.g. `project-members`,
 * `project-repos`); an unknown id registers nothing.
 */
export function PageTourNudge({ featureId }: { featureId: string; className?: string }) {
  const showPageNudge = useTourStore((s) => s.showPageNudge);
  const clearPageNudge = useTourStore((s) => s.clearPageNudge);

  useEffect(() => {
    const known = TOUR_FEATURES.some((f) => f.id === featureId);
    if (!known || wasNudgeDismissed(featureId)) return;
    showPageNudge(featureId);
    return () => clearPageNudge(featureId);
  }, [featureId, showPageNudge, clearPageNudge]);

  return null;
}
