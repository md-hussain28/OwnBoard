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

export function matchesEmployee(
  employee: Employee,
  query: string,
  roleFilter: RoleFilter,
  profileFilter: ProfileFilter,
  domainFilter: DomainFilter,
) {
  if (roleFilter !== "all" && employee.appRole !== roleFilter) return false;

  if (domainFilter === "unassigned" && employee.domainId) return false;
  if (
    domainFilter !== "all" &&
    domainFilter !== "unassigned" &&
    employee.domainId !== domainFilter
  ) {
    return false;
  }

  const hasTitle = Boolean(employee.role?.trim());
  const hasGithub = Boolean(employee.githubHandle?.trim());

  if (profileFilter === "missing_title" && hasTitle) return false;
  if (profileFilter === "missing_github" && hasGithub) return false;
  if (profileFilter === "complete" && (!hasTitle || !hasGithub)) return false;

  if (!query) return true;

  const haystack = [
    employee.name,
    employee.role ?? "",
    employee.githubHandle ?? "",
    employee.domainName ?? "",
    ROLE_META[employee.appRole].label,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}
