"use client";

import { Separator } from "@/ui";
import { SidebarTrigger } from "@/ui/sidebar";
import { AppBreadcrumbs } from "./app-breadcrumbs";
import { NotificationBell } from "./notification-bell";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/85 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <SidebarTrigger
        data-tour="sidebar-toggle"
        className="-ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
      />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="min-w-0 flex-1">
        <AppBreadcrumbs />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <div data-tour="notifications">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
