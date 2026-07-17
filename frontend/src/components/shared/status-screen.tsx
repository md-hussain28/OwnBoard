import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "warning" | "danger" | "info";

// Soft-fill well + saturated text per DESIGN.md. `warning` uses the honey-soft well (no
// amber-soft token exists) with amber text — both warm, so the 404 reads friendly not alarming.
const toneWell: Record<StatusTone, string> = {
  warning: "bg-brand-honey-soft text-brand-amber",
  danger: "bg-brand-coral-soft text-brand-coral",
  info: "bg-brand-info-soft text-brand-info",
};

type StatusScreenProps = {
  /** Large watermark code, e.g. "404" or "500". Optional. */
  code?: string;
  /** Icon rendered in a soft-tinted well above the title. */
  icon: ReactNode;
  tone?: StatusTone;
  title: string;
  description: string;
  /** Action buttons / links, laid out in a responsive row. */
  actions?: ReactNode;
  /** Optional extra detail below the actions (e.g. a collapsed error digest). */
  footer?: ReactNode;
  /** Constrain to the parent container instead of filling the viewport (used inside the app shell). */
  contained?: boolean;
  className?: string;
};

/**
 * Full-bleed status layout shared by the 404 page and every error boundary, so a dead-end
 * always looks branded and always offers a clear way out. Purely presentational (no hooks),
 * so it renders in both server components (not-found) and client boundaries (error).
 */
export function StatusScreen({
  code,
  icon,
  tone = "warning",
  title,
  description,
  actions,
  footer,
  contained = false,
  className,
}: StatusScreenProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center px-6 text-center",
        contained ? "min-h-[60vh] py-12" : "min-h-svh py-16",
        className,
      )}
    >
      {code ? (
        <span
          aria-hidden
          className="pointer-events-none select-none font-brand text-[7rem] font-extrabold leading-none tracking-tight text-foreground/5 sm:text-[9rem]"
        >
          {code}
        </span>
      ) : null}

      <div
        className={cn("relative flex max-w-md flex-col items-center", code && "-mt-14 sm:-mt-16")}
      >
        <span
          className={cn(
            "mb-6 inline-flex size-14 items-center justify-center rounded-2xl shadow-soft [&_svg]:size-7",
            toneWell[tone],
          )}
        >
          {icon}
        </span>

        <h1 className="font-brand text-2xl font-bold tracking-tight text-foreground text-balance sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>

        {actions ? (
          <div className="mt-8 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            {actions}
          </div>
        ) : null}

        {footer ? <div className="mt-6 w-full">{footer}</div> : null}
      </div>
    </div>
  );
}
