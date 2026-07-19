"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib";
import { ASSISTANT_NAV_ITEM, isNavItemActive } from "./nav-config";

const Icon = ASSISTANT_NAV_ITEM.icon;

/**
 * The admin AI Assistant, pinned in the sidebar footer just above "Manage Team". Styled as a distinct,
 * always-on co-pilot — a honey-tinted pill with a "live" status pip — rather than a plain nav row, so
 * it reads as a personal assistant you can summon at any time, not just another page in the list.
 */
export function AssistantNavLink({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, ASSISTANT_NAV_ITEM);

  if (collapsed) {
    return (
      <Link
        href={ASSISTANT_NAV_ITEM.href}
        data-tour="nav-assistant"
        title={ASSISTANT_NAV_ITEM.label}
        aria-label={ASSISTANT_NAV_ITEM.label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex size-8 items-center justify-center rounded-lg outline-hidden transition-colors duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          active
            ? "bg-brand-honey text-white shadow-button"
            : "bg-brand-honey-soft text-brand-honey hover:bg-brand-honey hover:text-white",
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <Link
      href={ASSISTANT_NAV_ITEM.href}
      data-tour="nav-assistant"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group/assistant relative flex h-11 w-full items-center gap-2.5 overflow-hidden rounded-xl px-2 text-left",
        "border outline-hidden transition-[color,background-color,border-color] duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "border-brand-honey/40 bg-brand-honey-soft shadow-soft"
          : "border-transparent bg-sidebar-accent/40 hover:border-brand-honey/25 hover:bg-brand-honey-soft/60",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
          active
            ? "bg-brand-honey text-white shadow-button"
            : "bg-brand-honey-soft text-brand-honey group-hover/assistant:bg-brand-honey group-hover/assistant:text-white",
        )}
      >
        <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold leading-none text-sidebar-foreground">
          {ASSISTANT_NAV_ITEM.label}
        </span>
        <span className="mt-1 block truncate text-[0.625rem] font-normal leading-none text-sidebar-foreground/55">
          {ASSISTANT_NAV_ITEM.description}
        </span>
      </span>
      {/* Quiet "ready" pip — signals a live agent standing by, without nagging motion. */}
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full transition-colors duration-150",
          active ? "bg-brand-teal" : "bg-brand-teal/60 group-hover/assistant:bg-brand-teal",
        )}
      />
    </Link>
  );
}
