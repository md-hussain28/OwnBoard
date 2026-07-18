import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  HomeIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ScrollTextIcon,
  SparklesIcon,
  UsersIcon,
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
      label: "Home",
      description: "Your overview",
      icon: HomeIcon,
    },
    {
      href: appPath("tracks"),
      label: "Onboarding",
      description: "Assign & track",
      icon: BookOpenCheckIcon,
      matchPrefix: true,
      roles: ["admin"],
    },
    {
      href: appPath("projects"),
      label: "Projects",
      description: "Teams & onboarding",
      icon: FolderKanbanIcon,
      matchPrefix: true,
      roles: ["admin"],
    },
    {
      href: appPath("onboarding", "packs"),
      label: "My modules",
      description: "Assigned onboarding",
      icon: ClipboardCheckIcon,
      matchPrefix: true,
      roles: ["member"],
    },
    {
      href: appPath("projects"),
      label: "My projects",
      description: "Your teams & access",
      icon: FolderKanbanIcon,
      matchPrefix: true,
      roles: ["member"],
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

/**
 * Per-project sub-navigation. Once a project is selected, its major sub-parts —
 * management, the git-history intelligence features, and Q&A — surface as
 * contextual sub-tabs in the sidebar (nested under the project) instead of as
 * top-level items. Every entry is a route segment under `/app/projects/:id`.
 */
export type ProjectSection = {
  /** Path suffix after `/app/projects/:id`. Empty string = the index (Overview). */
  key: string;
  label: string;
  icon: LucideIcon;
  /**
   * "manage" = only managers (org admin or this project's lead) see the section and
   * can open its route; it's an authoring/admin surface. "all" = everyone on the
   * project, including employees, gets it (read views + Ask). Default "all".
   */
  access?: "all" | "manage";
};

export const PROJECT_SECTIONS: ProjectSection[] = [
  { key: "", label: "Overview", icon: LayoutDashboardIcon },
  // Members leads the working sub-nav — it's the primary surface for admins & leads.
  { key: "members", label: "Members", icon: UsersIcon, access: "manage" },
  { key: "onboarding", label: "Modules", icon: ListChecksIcon },
  { key: "docs", label: "Docs", icon: ScrollTextIcon },
  { key: "repositories", label: "Repos", icon: GitBranchIcon, access: "manage" },
  { key: "ask", label: "Ask project", icon: SparklesIcon },
];

/** Sections visible/reachable for the current viewer. Managers see all; employees see the read/use set. */
export function projectSectionsForRole(canManage: boolean): ProjectSection[] {
  if (canManage) return PROJECT_SECTIONS;
  return PROJECT_SECTIONS.filter((s) => s.access !== "manage");
}

/** Whether a viewer may open a section's route (used to lock manage-only routes). */
export function canAccessProjectSection(key: string, canManage: boolean): boolean {
  if (canManage) return true;
  const section = PROJECT_SECTIONS.find((s) => s.key === key);
  return section ? section.access !== "manage" : true;
}

export function projectSectionPath(projectId: string, key: string): string {
  return key ? appPath("projects", projectId, key) : appPath("projects", projectId);
}

/** The active project id when the current route is inside a project, else null. */
export function projectIdFromPathname(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  // ["app", "projects", "<id>", ...]
  if (parts[0] !== "app" || parts[1] !== "projects") return null;
  const id = parts[2];
  if (!id || id === "new") return null;
  return id;
}

export function isProjectSectionActive(pathname: string, projectId: string, key: string): boolean {
  const base = appPath("projects", projectId);
  if (!key) return pathname === base || pathname === `${base}/`;
  const href = `${base}/${key}`;
  return pathname === href || pathname.startsWith(`${href}/`);
}
