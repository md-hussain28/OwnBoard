import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  FolderGit2Icon,
  NetworkIcon,
  SearchCodeIcon,
} from "lucide-react";
import { APP_HOME, appPath } from "@/lib/routes";
import type { AppRole } from "@/schemas/employee.schema";

export type NavItem = {
  href: string;
  label: string;
  /** Short line under the label — expanded sidebar only. */
  description?: string;
  icon: LucideIcon;
  /** Backend still stubbed — show Incoming badge, keep route clickable for demos. */
  incoming?: boolean;
  /** Match nested routes (e.g. /app/onboarding/policy-quiz). */
  matchPrefix?: boolean;
  /**
   * OwnBoard app_role gate. Omit = visible to every org member.
   * When set, only those roles see the item.
   */
  roles?: AppRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/** Workspace nav — filtered by OwnBoard `app_role` in the sidebar. */
export const WORKSPACE_NAV: NavGroup = {
  label: "Evidence desk",
  items: [
    {
      href: APP_HOME,
      label: "Codebases",
      description: "Connected repos",
      icon: FolderGit2Icon,
      roles: ["admin"],
    },
    {
      href: appPath("tracks"),
      label: "Tracks",
      description: "Assign & track",
      icon: BookOpenCheckIcon,
      matchPrefix: true,
      roles: ["admin"],
    },
    {
      href: appPath("onboarding", "packs"),
      label: "My tracks",
      description: "Assigned onboarding",
      icon: ClipboardCheckIcon,
      matchPrefix: true,
      roles: ["member"],
    },
    {
      href: appPath("onboarding"),
      label: "Readiness",
      description: "Policy & code quizzes",
      icon: ClipboardCheckIcon,
      incoming: true,
      matchPrefix: true,
      roles: ["admin"],
    },
    {
      href: appPath("chat"),
      label: "Archaeology",
      description: "Ask why the code is",
      icon: SearchCodeIcon,
      incoming: true,
      roles: ["admin"],
    },
    {
      href: appPath("dashboard"),
      label: "Skill map",
      description: "Who knows what",
      icon: NetworkIcon,
      incoming: true,
      roles: ["admin"],
    },
  ],
};

/**
 * Platform tenant admin — `/app/admin`, platform superadmins only.
 * Reached by URL (not org settings); create-org is hidden in the switcher.
 */
export const PLATFORM_ADMIN_HREF = appPath("admin");

export function navItemsForRole(role: AppRole | null | undefined): NavItem[] {
  return WORKSPACE_NAV.items.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href === APP_HOME) {
    return pathname === APP_HOME || pathname === `${APP_HOME}/`;
  }
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
