"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/ui/sidebar";
import {
  WORKSPACE_NAV,
  isNavItemActive,
  navItemsForRole,
  type NavItem,
} from "@/components/layout/nav-config";
import { SidebarAccountFooter } from "@/components/layout/sidebar-account-footer";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

function NavItems({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={item.label}
              className={cn(
                "h-auto min-h-9 gap-2.5 rounded-lg px-2 py-2 text-[0.8125rem] font-medium leading-none tracking-normal",
                "text-sidebar-foreground/70",
                "transition-[color,background-color] duration-150 ease-out",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!",
                active &&
                  "bg-sidebar-accent font-semibold text-sidebar-primary data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-primary",
                item.incoming && !active && "text-sidebar-foreground/45",
                item.incoming && "pr-[4.5rem] group-data-[collapsible=icon]:pr-0!",
              )}
            >
              <Link href={item.href}>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                    "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "bg-sidebar-foreground/6 text-sidebar-foreground/65",
                  )}
                >
                  <item.icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate leading-none">{item.label}</span>
                  {item.description && (
                    <span
                      className={cn(
                        "mt-1 block truncate text-[0.625rem] font-normal leading-none",
                        active ? "text-sidebar-primary/70" : "text-sidebar-foreground/40",
                      )}
                    >
                      {item.description}
                    </span>
                  )}
                </span>
              </Link>
            </SidebarMenuButton>
            {item.incoming && (
              <SidebarMenuBadge
                className={cn(
                  "right-2 top-1/2 h-5 -translate-y-1/2 rounded-md px-1.5",
                  "border-0 bg-sidebar-foreground/8 text-[0.625rem] font-medium leading-none",
                  "text-sidebar-foreground/55",
                  "peer-hover/menu-button:bg-sidebar-foreground/12 peer-hover/menu-button:text-sidebar-foreground/70",
                  "peer-data-active/menu-button:bg-sidebar-primary/15 peer-data-active/menu-button:text-sidebar-primary",
                )}
              >
                Soon
              </SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { appRole, isLoading } = useAppRole();
  const items = navItemsForRole(appRole);

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="font-sans">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="OwnBoard"
              className="h-8 gap-2.5 px-1 hover:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
            >
              <Link href={appRole === "member" ? "/onboarding/packs" : "/"}>
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-[0.6875rem] font-bold leading-none tracking-tight text-white shadow-button">
                  Ob
                </span>
                <span className="truncate text-[0.9375rem] font-semibold leading-none tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  OwnBoard
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-0 py-1">
        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="mb-2 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40 group-data-[collapsible=icon]:mb-0">
            {WORKSPACE_NAV.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div className="space-y-2 px-1 py-1">
                <Skeleton className="h-9 w-full rounded-lg bg-sidebar-foreground/10" />
                <Skeleton className="h-9 w-full rounded-lg bg-sidebar-foreground/10" />
              </div>
            ) : (
              <NavItems items={items} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarAccountFooter />
      <SidebarRail />
    </Sidebar>
  );
}
