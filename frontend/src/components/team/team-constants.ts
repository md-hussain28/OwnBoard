import { ShieldIcon, UserIcon } from "lucide-react";
import type { AppRole, Employee } from "@/schemas/employee.schema";

export type RoleFilter = "all" | AppRole;
export type ProfileFilter = "all" | "missing_title" | "missing_github" | "complete";
export type DomainFilter = "all" | "unassigned" | string;

export const NONE_DOMAIN = "__none__";

export const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "member", label: "Employees" },
];

export const PROFILE_FILTERS: { value: ProfileFilter; label: string }[] = [
  { value: "all", label: "Any profile" },
  { value: "missing_title", label: "Missing title" },
  { value: "missing_github", label: "Missing GitHub" },
  { value: "complete", label: "Complete profile" },
];

export const ROLE_META: Record<
  AppRole,
  { label: string; description: string; Icon: typeof ShieldIcon }
> = {
  admin: {
    label: "Admin",
    description: "Manage quizzes, repos, and invitations",
    Icon: ShieldIcon,
  },
  member: {
    label: "Employee",
    description: "Take quizzes and use the workspace",
    Icon: UserIcon,
  },
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

/** Job title only — strips Clerk org role slugs mistakenly stored in `role`. */
export function displayJobTitle(role: string | null | undefined): string | null {
  const cleaned = role?.trim();
  if (!cleaned) return null;
  const lowered = cleaned.toLowerCase();
  if (lowered.startsWith("org:") || lowered === "admin" || lowered === "member") {
    return null;
  }
  return cleaned;
}

export function memberSubtitle(employee: Employee): string {
  const domain = employee.domainName?.trim() || null;
  const title = displayJobTitle(employee.role);
  const parts = [domain, title].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  return "No job title yet";
}

function matchesRole(employee: Employee, roleFilter: RoleFilter): boolean {
  return roleFilter === "all" || employee.appRole === roleFilter;
}

function matchesDomain(employee: Employee, domainFilter: DomainFilter): boolean {
  if (domainFilter === "all") return true;
  if (domainFilter === "unassigned") return !employee.domainId;
  return employee.domainId === domainFilter;
}

function matchesProfile(employee: Employee, profileFilter: ProfileFilter): boolean {
  if (profileFilter === "all") return true;
  const hasTitle = Boolean(displayJobTitle(employee.role));
  const hasGithub = Boolean(employee.githubHandle?.trim());
  if (profileFilter === "missing_title") return !hasTitle;
  if (profileFilter === "missing_github") return !hasGithub;
  return hasTitle && hasGithub;
}

function matchesQuery(employee: Employee, query: string): boolean {
  if (!query) return true;
  const haystack = [
    employee.name,
    displayJobTitle(employee.role) ?? "",
    employee.githubHandle ?? "",
    employee.domainName ?? "",
    ROLE_META[employee.appRole].label,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function matchesEmployee(
  employee: Employee,
  query: string,
  roleFilter: RoleFilter,
  profileFilter: ProfileFilter,
  domainFilter: DomainFilter,
) {
  return (
    matchesRole(employee, roleFilter) &&
    matchesDomain(employee, domainFilter) &&
    matchesProfile(employee, profileFilter) &&
    matchesQuery(employee, query)
  );
}
