import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
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

/** Platform nav — only when the caller is a platform superadmin. */
export const PLATFORM_NAV: NavGroup = {
  label: "Platform",
  items: [
    {
      href: "/admin",
      label: "Tenants",
      icon: Building2,
      matchPrefix: true,
    },
  ],
};

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") {
    return pathname === "/";
  }
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
