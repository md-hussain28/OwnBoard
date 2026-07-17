"use client";

import { AppBreadcrumbs } from "@/components/layout/app-breadcrumbs";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Separator } from "@/ui/separator";
import { SidebarTrigger } from "@/ui/sidebar";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-background/85 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <SidebarTrigger className="-ml-0.5 text-muted-foreground transition-colors hover:text-foreground" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <div className="min-w-0 flex-1">
        <AppBreadcrumbs />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
