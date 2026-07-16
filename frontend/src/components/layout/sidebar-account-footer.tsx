"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Building2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { usePlatformAdminMe } from "@/hooks/queries/admin/admin.queries";
import { SidebarFooter, SidebarSeparator, useSidebar } from "@/ui/sidebar";
import { cn } from "@/lib/utils";

/** Hide Clerk's built-in "Create organization" — tenants are provisioned via /admin. */
export const hideCreateOrganizationAppearance = {
  elements: {
    organizationSwitcherPopoverActionButton__createOrganization: {
      display: "none",
    },
    organizationListCreateOrganizationActionButton: {
      display: "none",
    },
  },
} as const;

export function SidebarAccountFooter() {
  const { state, isMobile } = useSidebar();
  const { data: adminMe } = usePlatformAdminMe();
  const isSuperAdmin = Boolean(adminMe?.isPlatformAdmin);
  const collapsed = !isMobile && state === "collapsed";

  const appearance = {
    ...hideCreateOrganizationAppearance,
    elements: {
      ...hideCreateOrganizationAppearance.elements,
      ...(isSuperAdmin
        ? {}
        : {
            organizationSwitcherPopoverActionButton__manageOrganization: {
              display: "none",
            },
          }),
      rootBox: collapsed ? "w-auto" : "w-full",
      organizationSwitcherTrigger: cn(
        "rounded-lg border border-sidebar-border/80 bg-sidebar-accent/50 text-sidebar-foreground transition-colors duration-150 hover:bg-sidebar-accent",
        collapsed
          ? "size-8 justify-center border-0 bg-transparent p-0 hover:bg-sidebar-accent"
          : "w-full justify-between px-2 py-1.5",
      ),
      userButtonBox: collapsed ? "w-auto" : "w-full justify-start",
      userButtonTrigger: cn(
        "rounded-lg transition-colors duration-150",
        collapsed
          ? "size-8 justify-center"
          : "w-full justify-start rounded-lg border border-sidebar-border/80 bg-sidebar-accent/50 px-1.5 py-1 hover:bg-sidebar-accent",
      ),
    },
  };

  return (
    <SidebarFooter className="mt-auto gap-1.5 border-t border-sidebar-border p-2">
      <ThemeToggle />
      <SidebarSeparator className="mx-0 my-0.5" />
      <div
        className={cn(
          "flex w-full flex-col gap-1.5",
          collapsed && "items-center",
        )}
      >
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/"
          appearance={appearance}
        >
          {isSuperAdmin ? (
            <OrganizationSwitcher.OrganizationProfileLink
              label="Tenants"
              url="/admin"
              labelIcon={<Building2 className="size-4" />}
            />
          ) : null}
        </OrganizationSwitcher>
        <div
          className={cn(
            "flex w-full items-center",
            collapsed ? "justify-center" : "px-0.5",
          )}
        >
          <UserButton appearance={appearance} />
        </div>
      </div>
    </SidebarFooter>
  );
}
