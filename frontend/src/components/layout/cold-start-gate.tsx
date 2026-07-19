"use client";

import { CoffeeIcon, Loader2Icon, MoonIcon, ServerIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { COLD_START_QUIPS, cn } from "@/lib";

/**
 * Grace window before we assume the backend is cold. A warm backend answers `/api/health`
 * in a few hundred ms, so we render a near-invisible placeholder for this long instead of
 * flashing the "waking up" screen on every normal load.
 */
const GRACE_MS = 2_000;
/** Typical Render free-tier cold-start ceiling — drives the progress bar's easing, not a hard cap. */
const EXPECTED_WAKE_S = 55;
/** After this long the wake is unusually slow; offer a manual retry alongside the auto-polling. */
const SLOW_WAKE_S = 90;

type Phase = "grace" | "waking" | "ready";

async function ping(signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Warms the Render free-tier backend before the authenticated console mounts. The dyno sleeps
 * when idle and takes ~30–60s to wake, during which every data query would 503 — so instead of
 * a screen full of broken cards, we hold here with a friendly "waking up" screen and poll
 * `/api/health` until the backend answers, then reveal the app. A warm backend passes through
 * almost instantly (see GRACE_MS).
 */
export function ColdStartGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("grace");
  const [elapsed, setElapsed] = useState(0);
  // `attempt` bumps on manual retry to re-arm the polling effect.
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(0);

  // `attempt` is a trigger-only dep: bumping it restarts the polling loop on manual retry.
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt intentionally re-arms the effect.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    startedAt.current = Date.now();
    setElapsed(0);

    const tick = setInterval(() => {
      if (cancelled) return;
      const secs = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(secs);
      // Promote the barely-visible grace placeholder to the full screen once we're sure it's a cold start.
      setPhase((p) => (p === "grace" && Date.now() - startedAt.current >= GRACE_MS ? "waking" : p));
    }, 500);

    (async () => {
      // Poll until the backend answers. `ping` already caps each attempt (server route timeout),
      // so a small pause between rounds is enough to avoid hammering a waking dyno.
      while (!cancelled) {
        const ok = await ping(controller.signal);
        if (cancelled) return;
        if (ok) {
          setPhase("ready");
          clearInterval(tick);
          return;
        }
        await new Promise((r) => setTimeout(r, 1_500));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(tick);
    };
  }, [attempt]);

  if (phase === "ready") return <>{children}</>;

  // During the grace window, render an unobtrusive holding state so a warm backend shows no flash.
  if (phase === "grace") {
    return (
      <div className="flex min-h-svh items-center justify-center" aria-busy>
        <Loader2Icon
          className="size-5 animate-spin text-muted-foreground/60"
          aria-label="Loading"
        />
      </div>
    );
  }

  const progress = Math.min(95, Math.round((elapsed / EXPECTED_WAKE_S) * 100));
  const slow = elapsed >= SLOW_WAKE_S;
  // Rotate the quip every ~7s so the wait has a pulse instead of a dead spinner.
  const quip = COLD_START_QUIPS[Math.floor(elapsed / 7) % COLD_START_QUIPS.length];

  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      {/* Warm golden-hour glow so a plain loading screen still feels on-brand. */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 size-[32rem] -translate-x-1/2 rounded-full bg-brand-honey/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <span className="relative mb-7 inline-flex size-16 items-center justify-center rounded-2xl bg-brand-honey-soft text-brand-amber shadow-soft">
          <span
            className="absolute inset-0 rounded-2xl bg-brand-honey/20 animate-ping"
            aria-hidden
          />
          <ServerIcon className="relative size-7" aria-hidden />
          {/* Little floating "Zzz" moon so it reads as sleeping, not broken. */}
          <span
            className="absolute -right-2 -top-2 inline-flex size-6 animate-pulse items-center justify-center rounded-full bg-background text-brand-amber shadow-soft [animation-duration:2.4s]"
            aria-hidden
          >
            <MoonIcon className="size-3.5 fill-current" />
          </span>
        </span>

        <h1 className="font-brand text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
          Waking the server from its budget nap
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Yep — the backend runs on a <span className="font-medium text-foreground">free tier</span>{" "}
          that dozes off the second nobody&rsquo;s looking. Nothing&rsquo;s broken, we&rsquo;re just
          delightfully cheap. It usually takes 30&ndash;60 seconds, and everything loads itself the
          moment it&rsquo;s awake.
        </p>

        <div className="mt-8 w-full">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r from-brand-honey to-brand-amber transition-[width] duration-500 ease-out",
              )}
              style={{ width: `${progress}%` }}
            />
            {/* Indeterminate shimmer riding on top of the honest progress fill. */}
            <div
              className="absolute inset-y-0 -left-1/3 w-1/3 animate-[shimmer_1.6s_ease-in-out_infinite] rounded-full bg-white/40"
              aria-hidden
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
            <span
              key={quip}
              className="animate-in fade-in slide-in-from-bottom-1 text-pretty duration-500"
            >
              {quip}
            </span>
          </div>
          <p className="mt-2 text-[0.7rem] font-medium tabular-nums text-muted-foreground/60">
            Warming up · {elapsed}s
          </p>
        </div>

        {slow ? (
          <div className="mt-8 space-y-3 rounded-xl border border-border bg-brand-mist/60 px-5 py-4">
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-pretty">
              <CoffeeIcon className="size-3.5 shrink-0 text-brand-amber" aria-hidden />
              Okay, even for a free tier this is a bit rude. It should surface any second — feel
              free to give it a nudge.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-brand-mist"
            >
              Poke it again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
