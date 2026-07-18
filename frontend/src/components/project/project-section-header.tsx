import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The one header every project section uses — icon well + title + optional description on the
 * left, an optional action (button/dialog) on the right. Keeps Members / Modules / Docs / Repos /
 * Ask visually identical instead of each rolling its own heading.
 */
export function ProjectSectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-mist text-brand-ink">
          <Icon className="size-4" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
