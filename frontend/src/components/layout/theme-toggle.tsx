"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";
import { useSidebar } from "@/ui/sidebar";
import { Button } from "@/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { state, isMobile } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Dark" : "Light";
  const nextTheme = isDark ? "light" : "dark";
  const collapsed = !isMobile && state === "collapsed";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={() => setTheme(nextTheme)}
      className={cn(
        "w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "size-8 justify-center px-0",
        className,
      )}
    >
      {isDark ? (
        <MoonIcon className="size-4 shrink-0" />
      ) : (
        <SunIcon className="size-4 shrink-0" />
      )}
      {!collapsed && (
        <span className="truncate text-sm font-medium">{label}</span>
      )}
    </Button>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label} mode
      </TooltipContent>
    </Tooltip>
  );
}
