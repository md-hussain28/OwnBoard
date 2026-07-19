"use client";

import {
  DatabaseIcon,
  type LucideIcon,
  RadarIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib";

type Phase = { icon: LucideIcon; label: string };

/**
 * Pre-first-token indicator for the admin assistant. Its phases mirror what the agent actually does
 * before the live step timeline takes over (read org data → resolve people/projects → plan → act),
 * so even the wait reads as an agent getting to work rather than a spinner. Once the first real step
 * or token streams, the caller swaps this for the message itself. Motion collapses under
 * `prefers-reduced-motion`.
 */
const PHASES: Phase[] = [
  { icon: DatabaseIcon, label: "Reading your org's onboarding data…" },
  { icon: UsersRoundIcon, label: "Resolving people, projects & tracks…" },
  { icon: RadarIcon, label: "Planning the steps to take…" },
];

const PHASE_MS = 1600;

export function AssistantThinking({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= PHASES.length - 1) return;
    const t = setTimeout(() => setIndex((n) => Math.min(n + 1, PHASES.length - 1)), PHASE_MS);
    return () => clearTimeout(t);
  }, [index]);

  const phase = PHASES[index];
  const PhaseIcon = phase.icon;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center">
        <span className="ask-orb-sweep" aria-hidden />
        <span className="ask-orb-core relative flex size-7 items-center justify-center rounded-lg bg-brand-honey-soft text-brand-honey">
          <SparklesIcon className="size-4 motion-safe:animate-pulse" />
        </span>
      </span>

      <div className="flex min-w-0 flex-col gap-1.5" aria-live="polite">
        <div className="flex h-5 items-center overflow-hidden text-sm">
          <span
            key={index}
            className="ask-phase-in flex items-center gap-2 whitespace-nowrap text-foreground"
          >
            <PhaseIcon className="size-3.5 shrink-0 text-brand-teal" />
            <span className="font-medium">{phase.label}</span>
          </span>
        </div>
        <span
          className="relative h-1 w-44 max-w-full overflow-hidden rounded-full bg-brand-honey-soft"
          aria-hidden
        >
          <span className="ask-track-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-brand-honey to-transparent" />
        </span>
      </div>
    </div>
  );
}
