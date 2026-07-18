"use client";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ProductTour } from "@/components/tour/product-tour";
import { SidebarInset, SidebarProvider } from "@/ui/sidebar";
import { TooltipProvider } from "@/ui/tooltip";

/** Authenticated console shell for everything under `/app`. */
export function AppShell({ children }: { children: React.ReactNode }) {
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
        <ProductTour />
      </SidebarProvider>
    </TooltipProvider>
  );
}
