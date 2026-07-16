import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FolderGit2,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Backend still stubbed — show Incoming badge, keep route clickable for demos. */
  incoming?: boolean;
  /** Match nested routes (e.g. /onboarding/policy-quiz). */
  matchPrefix?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Workspace nav — shown to every signed-in org member. */
export const WORKSPACE_NAV: NavGroup = {
  label: "Workspace",
  items: [
    {
      href: "/",
      label: "Overview",
      icon: FolderGit2,
    },
    {
      href: "/onboarding",
      label: "Onboarding",
      icon: BookOpen,
      incoming: true,
      matchPrefix: true,
    },
    {
      href: "/chat",
      label: "Archaeology",
      icon: MessageSquare,
      incoming: true,
    },
    {
      href: "/dashboard",
      label: "Skill graph",
      icon: LayoutDashboard,
      incoming: true,
    },
  ],
};

/**
 * Platform / Tenants lives in the org switcher → Manage organization tabs
 * for platform superadmins only (see SidebarAccountFooter). Kept here for
 * shared active-route helpers if needed later.
 */
export const PLATFORM_ADMIN_HREF = "/admin";

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
