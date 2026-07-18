import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Time-of-day greeting word. Client-only (reads local time). */
export function greetingWord(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** First name for the greeting, gracefully degrading to a warm default. */
export function firstNameOf(fullOrFirst: string | null | undefined): string {
  const trimmed = (fullOrFirst ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/** Page-top greeting + one honest line about the state of things. */
export function HomeGreeting({
  name,
  line,
  loading,
}: {
  name: string;
  line: ReactNode;
  loading?: boolean;
}) {
  return (
    <section className="space-y-1.5">
      <h1 className="text-2xl font-bold tracking-tight text-balance">
        {greetingWord()}, {name}
      </h1>
      <p
        className={cn(
          "max-w-2xl text-pretty text-muted-foreground",
          loading && "animate-pulse text-muted-foreground/50",
        )}
      >
        {line}
      </p>
    </section>
  );
}

/** Quiet section heading with an optional "view all" affordance. */
export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="shrink-0 text-xs font-medium text-brand-teal transition-colors hover:text-brand-teal/80"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
