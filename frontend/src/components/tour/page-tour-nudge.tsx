"use client";

import { ArrowRightIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib";
import { TOUR_FEATURES } from "@/lib/tour";
import { useTourStore } from "@/stores";

/**
 * Bumped when a page's nudge copy/target changes materially, so a returning user
 * who already dismissed it is offered the refreshed walkthrough once more.
 */
const NUDGE_VERSION = "v1";
const dismissKey = (featureId: string) => `ownboard:tour:page-nudge:${NUDGE_VERSION}:${featureId}`;

function wasDismissed(featureId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(dismissKey(featureId)) === "1";
  } catch {
    return true; // storage blocked (private mode) — don't nag on every load
  }
}

function markDismissed(featureId: string): void {
  try {
    window.localStorage.setItem(dismissKey(featureId), "1");
  } catch {
    // ignore — best-effort persistence
  }
}

/**
 * A one-time, dismissible "want the tour of *this* page?" nudge for a sub-page.
 *
 * The whole product already has a spotlight walkthrough (`product-tour.tsx`) and a
 * floating launcher (`tour-trigger.tsx`). This is the contextual counterpart: the
 * first time someone lands on a given sub-page, a slim banner offers to run *that
 * page's* slice of the tour — deep-linked via `useTourStore().start(featureId)` so
 * it opens the walkthrough right on this stop instead of from the top.
 *
 * It's deliberately quiet: one thin line, styled in the target feature's own accent
 * so it reads as bespoke to the page, shown once per feature per browser. Dismissing
 * it (or launching the tour from it) remembers the choice and it never nags again.
 *
 * `featureId` must match a `TOUR_FEATURES` stop id (e.g. `project-members`,
 * `project-docs`); an unknown id renders nothing rather than a broken card.
 */
export function PageTourNudge({ featureId, className }: { featureId: string; className?: string }) {
  const start = useTourStore((s) => s.start);
  const feature = TOUR_FEATURES.find((f) => f.id === featureId);

  // Default hidden so nothing flashes during SSR/hydration; reveal on mount only
  // for a viewer who hasn't dismissed this page's nudge yet.
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!wasDismissed(featureId)) setShow(true);
  }, [featureId]);

  if (!feature || !show) return null;

  const Icon = feature.icon;
  const dismiss = () => {
    markDismissed(featureId);
    setShow(false);
  };
  const launch = () => {
    markDismissed(featureId);
    setShow(false);
    start(featureId);
  };

  return (
    <div
      style={{ animationDelay: "220ms" }}
      className={cn(
        // Floats above the page instead of sitting in the flow, so it never pushes content down.
        "fixed top-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2",
        "flex items-center gap-3 rounded-xl border border-primary/20 bg-background/95 px-3 py-2.5 shadow-lg backdrop-blur",
        "ring-1 ring-primary/10 ring-inset",
        "duration-500 ease-out animate-in fade-in-0 slide-in-from-top-2 fill-mode-backwards",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          feature.iconWell,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">
          First time on {feature.title}?
        </p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{feature.tagline}</p>
      </div>

      <button
        type="button"
        onClick={launch}
        className={cn(
          "group/tour inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
          "bg-primary/10 text-primary ring-1 ring-primary/20 ring-inset",
          "transition-[background-color,transform] duration-150 ease-out",
          "hover:bg-primary/15 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        )}
      >
        Show me around
        <ArrowRightIcon
          className="size-3.5 transition-transform duration-150 group-hover/tour:translate-x-0.5"
          aria-hidden
        />
      </button>

      <button
        type="button"
        onClick={dismiss}
        aria-label={`Dismiss the ${feature.title} tour tip`}
        className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
