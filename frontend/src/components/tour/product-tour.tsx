"use client";

import { type Config, type DriveStep, driver } from "driver.js";
import { useCallback, useEffect, useRef } from "react";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { TOUR_STEPS } from "@/lib/tour/tour-steps";
import { useTourStore } from "@/stores/tour-store";
import { useSidebar } from "@/ui/sidebar";
import "driver.js/dist/driver.css";
import "./tour.css";

/** Bumped when the tour content changes materially, so returning users see it once more. */
const TOUR_VERSION = "v1";
const SEEN_KEY = `ownboard:tour:${TOUR_VERSION}:seen`;

function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked (private mode) — don't nag on every load
  }
}

function markTourSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // ignore — best-effort persistence
  }
}

/** Keep only steps whose anchor is actually rendered (role-gated nav, off-canvas mobile, etc.). */
function presentSteps(): DriveStep[] {
  return TOUR_STEPS.filter((step) => {
    if (!step.element) return true; // modal steps (welcome / finish)
    if (typeof step.element !== "string") return true;
    return Boolean(document.querySelector(step.element));
  });
}

const DRIVER_CONFIG: Config = {
  showProgress: true,
  animate: true,
  smoothScroll: true,
  allowClose: true,
  // Driver paints the overlay as an SVG fill, so this must be a concrete color (not a
  // CSS var/token). Warm near-ink dims the surroundings and spotlights the target in
  // both light and dark themes; the stage cutout keeps the highlighted element bright.
  overlayColor: "#1c160c",
  overlayOpacity: 0.55,
  stagePadding: 6,
  stageRadius: 10,
  popoverClass: "ownboard-tour",
  progressText: "{{current}} of {{total}}",
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Done",
};

/**
 * Guided product tour, mounted once in the app shell.
 *
 * - Auto-runs the first time a signed-in member lands in the console (per browser,
 *   gated on `localStorage`), once their role is known so the right nav is rendered.
 * - Replays on demand via `useTourStore().start()` (the topbar "Take a tour" button).
 *
 * Renders nothing — it only orchestrates Driver.js.
 */
export function ProductTour() {
  const { appRole, isLoading } = useAppRole();
  const runNonce = useTourStore((s) => s.runNonce);
  const { setOpen, isMobile } = useSidebar();

  // Guards so React's double-invoke (StrictMode) and re-renders don't relaunch.
  const autoStartedRef = useRef(false);
  const lastNonceRef = useRef(runNonce);

  const runTour = useCallback(() => {
    // Expand the sidebar first so the highlighted nav rows show their labels,
    // not a collapsed icon rail; then let it paint before Driver measures anchors.
    if (!isMobile) setOpen(true);
    window.setTimeout(
      () => {
        const steps = presentSteps();
        if (steps.length === 0) return;
        const drv = driver({ ...DRIVER_CONFIG, steps });
        drv.drive();
      },
      isMobile ? 0 : 180,
    );
  }, [setOpen, isMobile]);

  // Manual replay (topbar button bumps the nonce).
  useEffect(() => {
    if (runNonce === lastNonceRef.current) return;
    lastNonceRef.current = runNonce;
    markTourSeen();
    runTour();
  }, [runNonce, runTour]);

  // First-visit auto-start, once role/nav has resolved.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (isLoading || !appRole) return;
    if (hasSeenTour()) return;
    autoStartedRef.current = true;
    markTourSeen();
    // Let the shell paint (sidebar items, topbar) before spotlighting them.
    const t = window.setTimeout(runTour, 650);
    return () => window.clearTimeout(t);
  }, [appRole, isLoading, runTour]);

  return null;
}
