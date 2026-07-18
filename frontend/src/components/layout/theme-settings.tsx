"use client";

import {
  Building2Icon,
  ChevronRightIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import { useAppRole } from "@/hooks/queries/me";
import { cn } from "@/lib";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui";
import { useSidebar } from "@/ui/sidebar";
import { ManageOrgDialog } from "./manage-org-dialog";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

/** Close the menu on outside pointer-down or Escape while it is open. */
function useDismissMenu(
  open: boolean,
  rootRef: React.RefObject<HTMLDivElement | null>,
  setOpen: (open: boolean) => void,
) {
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
  }, [open, rootRef, setOpen]);
}

function ThemeRow({
  activeTheme,
  onSelect,
}: {
  activeTheme: string;
  onSelect: (theme: ThemeValue) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1.5 py-1">
      <p className="text-xs font-medium text-muted-foreground">Theme</p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted p-0.5"
      >
        {THEME_OPTIONS.map((option) => {
          const selected = activeTheme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              title={option.label}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-[color,background-color,box-shadow] duration-150 ease-out",
                "outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40",
                selected
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onSelect(option.value)}
            >
              <option.icon className="size-3.5" strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceMenuItem({ onSelect }: { onSelect: () => void }) {
  return (
    <>
      <div className="my-1.5 h-px bg-border" />
      <button
        type="button"
        role="menuitem"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
          "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        )}
        onClick={onSelect}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-honey/15">
          <Building2Icon className="size-3.5 text-brand-honey" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-none text-foreground">Workspace</span>
          <span className="mt-1 block text-xs leading-none text-muted-foreground">
            Name and logo
          </span>
        </span>
        <ChevronRightIcon
          className="size-3.5 shrink-0 text-muted-foreground/50"
          strokeWidth={1.75}
        />
      </button>
    </>
  );
}

/** Settings control — theme + (admins) workspace name/logo. */
export function ThemeSettings({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { isAdmin, isLoading: roleLoading } = useAppRole();
  const { state, isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const collapsed = !isMobile && state === "collapsed";
  const showWorkspaceSettings = !roleLoading && isAdmin;

  useEffect(() => {
    setMounted(true);
  }, []);

  useDismissMenu(open, rootRef, setOpen);

  const activeTheme = mounted ? (theme ?? "system") : "system";

  return (
    <>
      <div ref={rootRef} className={cn("relative shrink-0", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Settings"
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
            Settings
          </TooltipContent>
        </Tooltip>

        {open && (
          <div
            id={menuId}
            role="menu"
            aria-label="Settings"
            className={cn(
              "absolute z-50 w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-soft",
              collapsed ? "bottom-0 left-full ml-2" : "bottom-full right-0 mb-2",
            )}
          >
            <ThemeRow activeTheme={activeTheme} onSelect={setTheme} />

            {showWorkspaceSettings && (
              <WorkspaceMenuItem
                onSelect={() => {
                  setOpen(false);
                  setOrgOpen(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {showWorkspaceSettings && <ManageOrgDialog open={orgOpen} onOpenChange={setOrgOpen} />}
    </>
  );
}
