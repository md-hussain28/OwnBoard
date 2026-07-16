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
  type NavGroup,
} from "@/components/layout/nav-config";
import { SidebarAccountFooter } from "@/components/layout/sidebar-account-footer";
import { cn } from "@/lib/utils";

function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const active = isNavItemActive(pathname, item);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    "transition-colors duration-150 ease-out",
                    active &&
                      "data-active:bg-sidebar-accent data-active:text-sidebar-primary",
                    item.incoming &&
                      (active ? "pr-16" : "pr-16 text-sidebar-foreground/60"),
                  )}
                >
                  <Link href={item.href}>
                    <item.icon
                      className={cn(active && "text-sidebar-primary")}
                    />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
                {item.incoming && (
                  <SidebarMenuBadge className="rounded-full border border-sidebar-border bg-transparent px-1.5 text-[10px] font-medium text-sidebar-foreground/55 peer-hover/menu-button:text-sidebar-foreground peer-data-active/menu-button:text-sidebar-foreground/80">
                    Incoming
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm font-semibold tracking-tight text-sidebar-foreground outline-none ring-sidebar-ring transition-colors duration-150 hover:text-sidebar-primary focus-visible:ring-2"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground shadow-none">
            Ob
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            OwnBoard
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1 py-1">
        <NavGroupSection group={WORKSPACE_NAV} />
      </SidebarContent>
      <SidebarAccountFooter />
      <SidebarRail />
    </Sidebar>
  );
}
