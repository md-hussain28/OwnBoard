"use client";

import { ArrowLeftIcon, ArrowRightIcon, LayoutGridIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { projectSectionPath } from "@/components/layout";
import { useAppRole } from "@/hooks/queries/me";
import { useMyProjects, useProjects } from "@/hooks/queries/project";
import { cn } from "@/lib";
import { type TourFeature, tourFeaturesForRole } from "@/lib/tour";
import { useTourStore } from "@/stores";
import { Button } from "@/ui";
import { useSidebar } from "@/ui/sidebar";

/** Bumped when the tour content changes materially, so returning users see it once more. */
const TOUR_VERSION = "v5";
const SEEN_KEY = `ownboard:tour:${TOUR_VERSION}:seen`;

/** Gap between the spotlit element and the card, and padding around the cutout. */
const CARD_GAP = 16;
const HOLE_PAD = 8;
/** Estimated card box used only to keep it inside the viewport before it's measured. */
const CARD_W = 360;
const CARD_H_EST = 320;
const DIM = "rgb(20 16 9 / 0.62)";

type Rect = { top: number; left: number; width: number; height: number };

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

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Where to put the card relative to the spotlit element (or centered when none). */
function placeCard(rect: Rect | null): { top: number; left: number; transform: string } {
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  if (!rect) {
    return { top: vh / 2, left: vw / 2, transform: "translate(-50%, -50%)" };
  }
  const midY = rect.top + rect.height / 2;
  const clampY = clamp(midY, 16 + CARD_H_EST / 2, vh - 16 - CARD_H_EST / 2);
  // Prefer right of the target (nav lives on the left), then left, then below.
  if (rect.left + rect.width + CARD_GAP + CARD_W <= vw) {
    return { left: rect.left + rect.width + CARD_GAP, top: clampY, transform: "translateY(-50%)" };
  }
  if (rect.left - CARD_GAP - CARD_W >= 0) {
    return { left: rect.left - CARD_GAP - CARD_W, top: clampY, transform: "translateY(-50%)" };
  }
  return {
    left: clamp(rect.left, 16, vw - 16 - CARD_W),
    top: clamp(rect.top + rect.height + CARD_GAP, 16, vh - 16 - CARD_H_EST),
    transform: "none",
  };
}

/**
 * Measure the spotlit element and keep tracking it (layout settles after nav/scroll).
 *
 * The target may not exist yet — project-section panels only mount once their route
 * has loaded and the project data has resolved — so we poll until it appears (up to a
 * few seconds), scroll it into view once found, then track it via rAF/resize/scroll.
 */
function useSpotlightRect(open: boolean, anchor: string | undefined): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor) {
      setRect(null);
      return;
    }
    let raf = 0;
    /** Returns true once the element exists and has been measured. */
    const measure = () => {
      const el = document.querySelector(anchor);
      if (!el) {
        setRect(null);
        return false;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      return true;
    };
    const scrollToTarget = () =>
      document.querySelector(anchor)?.scrollIntoView({ block: "center", behavior: "smooth" });

    scrollToTarget();
    // Poll until the (possibly fetch-delayed) panel mounts, then stop polling.
    const poll = window.setInterval(() => {
      if (measure()) {
        scrollToTarget();
        window.clearInterval(poll);
      }
    }, 120);
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 5000);
    // Short rAF burst to catch layout settling right after navigation.
    const onFrame = () => {
      measure();
      raf = window.requestAnimationFrame(onFrame);
    };
    raf = window.requestAnimationFrame(onFrame);
    const stopRaf = window.setTimeout(() => window.cancelAnimationFrame(raf), 1200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
      window.clearTimeout(stopRaf);
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchor]);
  return rect;
}

/**
 * Effective route + anchor for the current stop.
 *
 * Project-section stops (`feature.projectSection`) open a *real* project so the
 * section's actual on-page content renders and can be spotlit — we resolve the
 * viewer's first project (admins list all, members list theirs), and only while the
 * tour runs, so this never fetches on a normal page load. The spotlight lands on the
 * live section panel (`[data-tour="project-panel-<key>"]`, added to each section
 * view). If there's no project yet, the stop falls back to its own `route` (the
 * projects list) and shows centered.
 */
function useTourStep(
  open: boolean,
  appRole: string | null | undefined,
  feature: TourFeature | undefined,
): { route: string | undefined; anchor: string | undefined } {
  const isMember = appRole === "member";
  const { data: adminProjects } = useProjects(open && !isMember);
  const { data: myProjects } = useMyProjects(open && isMember);
  const projectId = (isMember ? myProjects?.[0]?.id : adminProjects?.[0]?.id) ?? null;

  return useMemo(() => {
    if (!feature) return { route: undefined, anchor: undefined };
    if (feature.projectSection !== undefined && projectId) {
      return {
        route: projectSectionPath(projectId, feature.projectSection),
        anchor: `[data-tour="project-panel-${feature.projectSection}"]`,
      };
    }
    return { route: feature.route, anchor: feature.anchor };
  }, [feature, projectId]);
}

/** Esc closes, arrows step — bound while the tour is open. */
function useTourKeys(open: boolean, close: () => void, next: () => void, prev: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);
}

type CardProps = {
  feature: TourFeature;
  features: TourFeature[];
  index: number;
  rect: Rect | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onMenu: () => void;
  onJump: (index: number) => void;
};

/** The floating explanation card, pointed at the spotlit element (or centered). */
function TourCard({
  feature,
  features,
  index,
  rect,
  onClose,
  onPrev,
  onNext,
  onMenu,
  onJump,
}: CardProps) {
  const total = features.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Icon = feature.icon;
  const pos = placeCard(rect);

  return (
    <div
      className="pointer-events-auto absolute w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-card-hover ring-1 ring-foreground/10 transition-[top,left] duration-300 ease-out"
      style={{ top: pos.top, left: pos.left, transform: pos.transform }}
    >
      {/* Content re-keys on the feature id so each step's copy re-animates in. */}
      <div
        key={feature.id}
        className="px-5 pt-5 pb-4 duration-300 animate-in fade-in-0 slide-in-from-bottom-1"
      >
        <div className="flex items-center justify-between gap-2">
          {/* The step counter doubles as the "show me everything" affordance. */}
          <button
            type="button"
            onClick={onMenu}
            className="group/menu -mx-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutGridIcon className="size-3.5" aria-hidden />
            Step {index + 1} of {total}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="-mr-1.5 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",
              feature.iconWell,
            )}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="font-heading text-base font-bold tracking-tight text-balance">
              {feature.title}
            </h2>
            <p className="text-sm font-medium text-primary">{feature.tagline}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
          {feature.body}
        </p>

        {feature.highlights && feature.highlights.length > 0 && (
          <ul className="mt-3 space-y-2">
            {feature.highlights.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm leading-snug">
                <span
                  aria-hidden
                  className="mt-1.5 flex size-1.5 shrink-0 rounded-full bg-primary"
                />
                <span className="text-pretty text-foreground/90">{point}</span>
              </li>
            ))}
          </ul>
        )}

        {feature.howTo && (
          <div className="mt-3 rounded-lg border border-border/70 bg-muted/50 px-3.5 py-2.5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              How to use it
            </p>
            <p className="mt-1 text-sm leading-relaxed text-pretty text-foreground">
              {feature.howTo}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {features.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onJump(i)}
              aria-label={`Go to ${f.title}`}
              aria-current={i === index ? "step" : undefined}
              className="group/dot -my-1.5 flex items-center py-1.5"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200 ease-out",
                  i === index
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-border group-hover/dot:bg-muted-foreground/50",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isFirst ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onPrev}>
              <ArrowLeftIcon />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? "Get started" : "Next"}
            {!isLast && <ArrowRightIcon />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Guided product tour, mounted once in the app shell.
 *
 * An interactive spotlight walkthrough: one feature at a time, it navigates to the
 * real page, cuts a highlight around the actual UI element (sidebar item, bell),
 * and points a card at it explaining what it does and how to use it.
 *
 * - Auto-runs the first time a signed-in member lands in the console (per browser,
 *   gated on `localStorage`), once their role is known so the right cards show.
 * - Replays on demand via `useTourStore().start()` (the floating launcher).
 */
export function ProductTour() {
  const { appRole, isLoading } = useAppRole();
  const runNonce = useTourStore((s) => s.runNonce);
  const startId = useTourStore((s) => s.startId);
  const openMenu = useTourStore((s) => s.openMenu);
  const router = useRouter();
  const { setOpen: setSidebarOpen, isMobile } = useSidebar();

  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const features = useMemo(() => tourFeaturesForRole(appRole), [appRole]);
  const total = features.length;
  const clamped = Math.min(index, Math.max(total - 1, 0));
  const feature = features[clamped];
  const step = useTourStep(open, appRole, feature);

  const autoStartedRef = useRef(false);
  const lastNonceRef = useRef(runNonce);

  const launch = useCallback(
    (id?: string | null) => {
      if (features.length === 0) return;
      const at = id ? features.findIndex((f) => f.id === id) : 0;
      setIndex(at >= 0 ? at : 0);
      setOpen(true);
      if (!isMobile) setSidebarOpen(true); // expand so nav labels are visible
    },
    [features, isMobile, setSidebarOpen],
  );
  const close = useCallback(() => setOpen(false), []);
  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= total - 1) {
        setOpen(false);
        return i;
      }
      return i + 1;
    });
  }, [total]);
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goTo = useCallback((i: number) => setIndex(i), []);
  // Hand control back to the launcher menu ("All steps").
  const showMenu = useCallback(() => {
    setOpen(false);
    openMenu();
  }, [openMenu]);

  // Manual (re)launch — the launcher bumps the nonce, optionally with a feature id.
  useEffect(() => {
    if (runNonce === lastNonceRef.current) return;
    lastNonceRef.current = runNonce;
    markTourSeen();
    launch(startId);
  }, [runNonce, startId, launch]);

  // First-visit auto-start, once role has resolved.
  useEffect(() => {
    if (autoStartedRef.current || isLoading || !appRole || hasSeenTour()) return;
    autoStartedRef.current = true;
    markTourSeen();
    const t = window.setTimeout(() => launch(), 650);
    return () => window.clearTimeout(t);
  }, [appRole, isLoading, launch]);

  // Navigate to the real page this card describes.
  const route = open ? step.route : undefined;
  useEffect(() => {
    if (route) router.push(route);
  }, [route, router]);

  useTourKeys(open, close, goNext, goPrev);
  const rect = useSpotlightRect(open, open ? step.anchor : undefined);

  if (!open || !feature) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim + spotlight: a transparent hole with a massive shadow darkening the rest. */}
      {rect ? (
        <>
          <div
            aria-hidden
            className="pointer-events-auto absolute rounded-xl transition-all duration-300 ease-out"
            style={{
              top: rect.top - HOLE_PAD,
              left: rect.left - HOLE_PAD,
              width: rect.width + HOLE_PAD * 2,
              height: rect.height + HOLE_PAD * 2,
              boxShadow: `0 0 0 9999px ${DIM}`,
            }}
          />
          {/* Pulsing ring on top of the hole — draws the eye to the real element. */}
          <div
            aria-hidden
            className="tour-ring-pulse pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300 ease-out"
            style={{
              top: rect.top - HOLE_PAD,
              left: rect.left - HOLE_PAD,
              width: rect.width + HOLE_PAD * 2,
              height: rect.height + HOLE_PAD * 2,
            }}
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-auto absolute inset-0"
          style={{ background: DIM }}
        />
      )}

      <TourCard
        feature={feature}
        features={features}
        index={clamped}
        rect={rect}
        onClose={close}
        onPrev={goPrev}
        onNext={goNext}
        onMenu={showMenu}
        onJump={goTo}
      />
    </div>
  );
}
