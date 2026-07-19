"use client";

import {
  FileCode2Icon,
  FileTextIcon,
  GitCommitHorizontalIcon,
  type LucideIcon,
  SearchIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn, useRotatingPun } from "@/lib";

type Phase = { icon: LucideIcon; label: string };

/**
 * The steps the "thinking" indicator walks through while the assistant works before its first
 * token lands. These mirror what the backend actually does (retrieve → read docs → scan history →
 * cross-reference code → find experts → draft), so the animation reads like real work in progress
 * rather than a generic spinner. It advances and then holds on the final step.
 */
const THINKING_PHASES: Phase[] = [
  { icon: SearchIcon, label: "Searching the project's knowledge…" },
  { icon: FileTextIcon, label: "Reading the docs…" },
  { icon: GitCommitHorizontalIcon, label: "Scanning commit history…" },
  { icon: FileCode2Icon, label: "Cross-referencing the code…" },
  { icon: UsersRoundIcon, label: "Checking who knows this best…" },
  { icon: SparklesIcon, label: "Drafting a grounded answer…" },
];

const PHASE_MS = 1900;

/**
 * "Thinking" indicator for the Ask project chat: a scanning honey/teal orb (radar sweep +
 * breathing glow) beside phase labels that slide in as the assistant progresses, over an
 * indeterminate shimmer track. Doubles as the assistant avatar for the pending turn, so the
 * caller renders it in place of a message. Motion collapses under `prefers-reduced-motion`.
 */
export function AskThinking({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const pun = useRotatingPun();

  useEffect(() => {
    // Walk forward through the phases, then hold on the last one — never loop back to "Searching…",
    // which would read as the assistant restarting.
    if (index >= THINKING_PHASES.length - 1) return;
    const t = setTimeout(
      () => setIndex((n) => Math.min(n + 1, THINKING_PHASES.length - 1)),
      PHASE_MS,
    );
    return () => clearTimeout(t);
  }, [index]);

  const phase = THINKING_PHASES[index];
  const PhaseIcon = phase.icon;
  // Once we've reached the final step and are just waiting on the slow free-tier backend,
  // drop in a rotating pun so a long wait feels charming instead of frozen.
  const holding = index >= THINKING_PHASES.length - 1;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Scanning orb: a sparkle core wrapped in a rotating radar sweep and a breathing glow ring. */}
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        <span className="ask-orb-sweep" aria-hidden />
        <span className="ask-orb-core relative flex size-7 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
          <SparklesIcon className="size-4 motion-safe:animate-pulse" />
        </span>
      </span>

      <div className="flex min-w-0 flex-col gap-1.5" aria-live="polite">
        <div className="flex h-5 items-center overflow-hidden text-sm">
          {/* Remounting on `index` replays the slide-in so each step animates in as work advances. */}
          <span
            key={index}
            className="ask-phase-in flex items-center gap-2 whitespace-nowrap text-foreground"
          >
            <PhaseIcon className="size-3.5 shrink-0 text-brand-teal" />
            <span className="font-medium">{phase.label}</span>
          </span>
        </div>
        {/* Indeterminate progress track — a honey pulse sweeping across a soft rail. */}
        <span
          className="relative h-1 w-44 max-w-full overflow-hidden rounded-full bg-brand-honey-soft"
          aria-hidden
        >
          <span className="ask-track-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-brand-honey to-transparent" />
        </span>
        {holding ? (
          <span
            key={pun}
            className="ask-phase-in text-xs text-muted-foreground text-pretty"
            aria-live="polite"
          >
            {pun}
          </span>
        ) : null}
      </div>
    </div>
  );
}
