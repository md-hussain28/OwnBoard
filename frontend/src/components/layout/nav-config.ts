import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  FolderGit2Icon,
  NetworkIcon,
  SearchCodeIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  /** Short line under the label — expanded sidebar only. */
  description?: string;
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
  label: "Evidence desk",
  items: [
    {
      href: "/",
      label: "Codebases",
      description: "Connected repos",
      icon: FolderGit2Icon,
    },
    {
      href: "/doc-packs",
      label: "Quizzes",
      description: "Assign & track",
      icon: BookOpenCheckIcon,
      matchPrefix: true,
    },
    {
      href: "/onboarding",
      label: "Readiness",
      description: "Policy & code quizzes",
      icon: ClipboardCheckIcon,
      incoming: true,
      matchPrefix: true,
    },
    {
      href: "/chat",
      label: "Archaeology",
      description: "Ask why the code is",
      icon: SearchCodeIcon,
      incoming: true,
    },
    {
      href: "/dashboard",
      label: "Skill map",
      description: "Who knows what",
      icon: NetworkIcon,
      incoming: true,
    },
  ],
};

/**
 * Platform tenant admin — `/admin`, platform superadmins only.
 * Reached by URL (not org settings); create-org is hidden in the switcher.
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
