"use client";

import { ChevronRightIcon, CompassIcon, PlayIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppRole } from "@/hooks/queries/me";
import { cn } from "@/lib";
import { tourFeaturesForRole } from "@/lib/tour";
import { useTourStore } from "@/stores";

/** Persisted once the user opens the launcher for the first time — stops the beacon. */
const FAB_ENGAGED_KEY = "ownboard:tour:fab-engaged";

/**
 * Whether the launcher has been opened before, plus a one-shot `engage()`.
 *
 * Until a genuinely new user opens it once, the round launcher floats and pulses a
 * beacon so the eye finds it in the corner. Defaults to "engaged" so nothing flashes
 * during SSR/hydration, then relaxes on mount for users unknown in storage.
 */
function useFabEngaged(): { engaged: boolean; engage: () => void } {
  const [engaged, setEngaged] = useState(true);
  useEffect(() => {
    try {
      setEngaged(window.localStorage.getItem(FAB_ENGAGED_KEY) === "1");
    } catch {
      setEngaged(true); // storage blocked — don't nag
    }
  }, []);
  const engage = () => {
    if (engaged) return;
    setEngaged(true);
    try {
      window.localStorage.setItem(FAB_ENGAGED_KEY, "1");
    } catch {
      // ignore — best-effort persistence
    }
  };
  return { engaged, engage };
}

/**
 * Floating, always-available launcher for the guided product tour.
 *
 * Collapsed, it's a round compass button pinned to the bottom-right of the console.
 * Clicking it expands a panel that lists *every* tour stop, so the user can either
 * take the whole walkthrough or jump straight to the one feature they care about —
 * each row deep-links the spotlight tour to that feature. The running tour hands
 * control back here via `openMenu()` ("All steps"), so the two form a loop.
 *
 * Sits below the tour overlay (z-40 < z-60) so it tucks away while a tour runs.
 */
export function TourTrigger() {
  const { appRole } = useAppRole();
  const start = useTourStore((s) => s.start);
  const menuOpen = useTourStore((s) => s.menuOpen);
  const toggleMenu = useTourStore((s) => s.toggleMenu);
  const closeMenu = useTourStore((s) => s.closeMenu);

  const features = tourFeaturesForRole(appRole);

  // Draw the eye to the launcher until the user has opened it once, ever.
  const { engaged, engage } = useFabEngaged();
  const handleToggle = () => {
    engage();
    toggleMenu();
  };
  const showBeacon = !engaged && !menuOpen;

  // Esc closes the menu (the running tour has its own Esc handler).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  // Nothing to tour (role not resolved yet) — don't show a dead button.
  if (features.length === 0) return null;

  return (
    <>
      {/* Click-away backdrop — only while the menu is open. */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close tour menu"
          onClick={closeMenu}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
        />
      )}

      <div className="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-3">
        {menuOpen && (
          <div
            role="dialog"
            aria-label="Product tour menu"
            className={cn(
              "w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-border",
              "bg-popover text-popover-foreground shadow-card-hover ring-1 ring-foreground/10",
              "duration-200 ease-out animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4",
            )}
          >
            {/* Header — warm brand band so the panel reads as its own little product. */}
            <div className="relative overflow-hidden bg-brand-gradient px-5 pt-5 pb-4 text-primary-foreground">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-8 -right-6 size-28 rounded-full bg-white/15 blur-2xl"
              />
              <div className="relative flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/25 ring-inset">
                  <CompassIcon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="font-heading text-base font-bold tracking-tight text-balance">
                    Explore OwnBoard
                  </h2>
                  <p className="text-[0.8125rem] font-medium text-primary-foreground/85">
                    {features.length} interactive stops · pick one or take them all
                  </p>
                </div>
              </div>
            </div>

            {/* Primary CTA — walk the whole thing. */}
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => start()}
                className={cn(
                  "group/cta flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                  "bg-primary/10 text-foreground ring-1 ring-primary/20 ring-inset",
                  "transition-[background-color,transform] duration-150 ease-out",
                  "hover:bg-primary/15 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground shadow-button">
                  <PlayIcon className="size-4 translate-x-px fill-current" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">
                    Take the full tour
                  </span>
                  <span className="block text-xs leading-tight text-muted-foreground">
                    Start to finish, ~1 minute
                  </span>
                </span>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </div>

            {/* Jump straight to any feature. */}
            <p className="px-5 pt-4 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Or jump to a feature
            </p>
            <div className="max-h-[min(22rem,45vh)] overflow-y-auto px-2 pb-2">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => start(feature.id)}
                    style={{ animationDelay: `${60 + i * 35}ms` }}
                    className={cn(
                      "group/row flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                      "transition-[background-color] duration-150 ease-out hover:bg-muted",
                      "focus-visible:outline-none focus-visible:bg-muted",
                      "duration-300 animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-backwards",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg",
                        feature.iconWell,
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight text-foreground">
                        {feature.title}
                      </span>
                      <span className="block truncate text-xs leading-tight text-muted-foreground">
                        {feature.tagline}
                      </span>
                    </span>
                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground/50 transition-[transform,color] duration-150 group-hover/row:translate-x-0.5 group-hover/row:text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* The round launcher itself — floats gently until first opened. */}
        <div className={cn("relative self-end", showBeacon && "tour-fab-float")}>
          {/* Pulsing beacon ring behind the button — retires after the first open. */}
          {showBeacon && (
            <span
              aria-hidden
              className="tour-fab-beacon pointer-events-none absolute inset-0 rounded-full"
            />
          )}
          <button
            type="button"
            data-tour="tour-trigger"
            onClick={handleToggle}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close tour menu" : "Take a tour"}
            className={cn(
              "group/fab relative flex items-center gap-2 rounded-full font-semibold text-primary-foreground",
              "bg-brand-gradient shadow-card-hover ring-1 ring-white/15 ring-inset",
              "transition-[transform,box-shadow,padding] duration-200 ease-out",
              "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              menuOpen ? "size-12 justify-center p-0" : "h-12 pr-5 pl-4",
            )}
          >
            <span className="relative flex size-5 items-center justify-center">
              <CompassIcon
                className={cn(
                  "absolute size-5 transition-[opacity,transform] duration-200 ease-out",
                  menuOpen
                    ? "scale-50 opacity-0 blur-[2px]"
                    : "scale-100 opacity-100 group-hover/fab:rotate-45",
                )}
                aria-hidden
              />
              <XIcon
                className={cn(
                  "absolute size-5 transition-[opacity,transform] duration-200 ease-out",
                  menuOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 blur-[2px]",
                )}
                aria-hidden
              />
            </span>
            {!menuOpen && <span className="text-sm">Take a tour</span>}
          </button>
        </div>
      </div>
    </>
  );
}
