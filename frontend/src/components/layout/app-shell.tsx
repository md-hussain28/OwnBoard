"use client";

import { useAuth } from "@clerk/nextjs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SidebarInset, SidebarProvider } from "@/ui/sidebar";
import { TooltipProvider } from "@/ui/tooltip";

/**
 * Signed-in: collapsible sidebar + topbar (console shell).
 * Signed-out: marketing header only — used for the public home at `/`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <div className="h-14 border-b border-border/80" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <MarketingHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <AppTopbar />
          <div className="flex flex-1 flex-col">
            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
