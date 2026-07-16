"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { CheckIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react";
import { useSidebar } from "@/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/tooltip";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

/** Subtle icon control — opens Light / Dark / System. */
export function ThemeSettings({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { state, isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const collapsed = !isMobile && state === "collapsed";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeTheme = mounted ? (theme ?? "system") : "system";

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Appearance settings"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              "text-sidebar-foreground/45 outline-hidden transition-colors duration-150",
              "hover:bg-sidebar-accent hover:text-sidebar-foreground/80",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              open && "bg-sidebar-accent text-sidebar-foreground/90",
            )}
          >
            <SettingsIcon className="size-4" strokeWidth={1.75} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={collapsed ? "right" : "top"} sideOffset={6}>
          Appearance
        </TooltipContent>
      </Tooltip>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Appearance"
          className={cn(
            "absolute z-50 min-w-44 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-soft",
            collapsed
              ? "bottom-0 left-full ml-2"
              : "bottom-full right-0 mb-2",
          )}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">
            Appearance
          </p>
          {THEME_OPTIONS.map((option) => {
            const selected = activeTheme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  selected && "bg-muted font-medium",
                )}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
              >
                <option.icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-left">{option.label}</span>
                {selected && <CheckIcon className="size-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
