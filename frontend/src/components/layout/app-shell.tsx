"use client";

import { ProductTour, TourTrigger } from "@/components/tour";
import { TooltipProvider } from "@/ui";
import { SidebarInset, SidebarProvider } from "@/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

/** Authenticated console shell for everything under `/app`. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <AppTopbar />
          <div className="flex flex-1 flex-col">
            <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
          </div>
        </SidebarInset>
        <TourTrigger />
        <ProductTour />
      </SidebarProvider>
    </TooltipProvider>
  );
}
