"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  AtSignIcon,
  CheckCircle2Icon,
  CheckIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useEmployees } from "@/hooks/queries/employee/employee.queries";
import {
  useInviteEmployee,
  useUpdateEmployee,
} from "@/hooks/queries/employee/employee.mutations";
import {
  useCreateOrgDomain,
  useDeleteOrgDomain,
  useOrgDomains,
  useUpdateOrgDomain,
} from "@/hooks/queries/org-domain/org-domain.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | AppRole;
type ProfileFilter = "all" | "missing_title" | "missing_github" | "complete";
type DomainFilter = "all" | "unassigned" | string;

const NONE_DOMAIN = "__none__";

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "member", label: "Employees" },
];

const PROFILE_FILTERS: { value: ProfileFilter; label: string }[] = [
  { value: "all", label: "Any profile" },
  { value: "missing_title", label: "Missing title" },
  { value: "missing_github", label: "Missing GitHub" },
  { value: "complete", label: "Complete profile" },
];

const ROLE_META: Record<
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  "aria-label": string;
}) {
  const active = value !== "all";
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className={cn(
          "shrink-0",
          active && "border-primary/40 text-foreground",
          !active && "text-muted-foreground",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function matchesEmployee(
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

function RoleSelect({
  value,
  onChange,
  disabled,
  id,
  size = "default",
  className,
}: {
  value: AppRole;
  onChange: (role: AppRole) => void;
  disabled?: boolean;
  id?: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const meta = ROLE_META[value];

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as AppRole)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label="App role"
        className={cn(
          "min-w-[7.5rem]",
          value === "admin" && "border-primary/35 text-foreground",
          className,
        )}
      >
        <meta.Icon
          className={cn(
            "size-3.5",
            value === "admin" ? "text-primary" : "text-muted-foreground",
          )}
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[14rem]">
        {(Object.keys(ROLE_META) as AppRole[]).map((role) => {
          const option = ROLE_META[role];
          return (
            <SelectItem
              key={role}
              value={role}
              textValue={option.label}
              className="items-start py-2.5"
            >
              <span className="flex gap-2.5 [[data-slot=select-value]_&]:contents">
                <option.Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0 [[data-slot=select-value]_&]:hidden",
                    role === "admin" ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="flex flex-col gap-0.5 [[data-slot=select-value]_&]:contents">
                  <span className="font-medium leading-none [[data-slot=select-value]_&]:font-normal">
                    {option.label}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground text-pretty [[data-slot=select-value]_&]:hidden">
                    {option.description}
                  </span>
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function InviteMemberDialog({
  open,
  onOpenChange,
  domains,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
  onSent: (email: string) => void;
}) {
  const invite = useInviteEmployee();
  const formId = useId();
  const emailId = `${formId}-email`;
  const domainIdField = `${formId}-domain`;
  const accessId = `${formId}-access`;
  const titleId = `${formId}-title`;
  const githubId = `${formId}-github`;

  const [email, setEmail] = useState("");
  const [appRole, setAppRole] = useState<AppRole>("member");
  const [domainId, setDomainId] = useState(NONE_DOMAIN);
  const [jobTitle, setJobTitle] = useState("");
  const [githubHandle, setGithubHandle] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setAppRole("member");
    setDomainId(NONE_DOMAIN);
    setJobTitle("");
    setGithubHandle("");
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) invite.reset();
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    invite.mutate(
      {
        email: trimmed,
        appRole,
        role: jobTitle.trim() || null,
        githubHandle: githubHandle.trim().replace(/^@/, "") || null,
        domainId: domainId === NONE_DOMAIN ? null : domainId,
      },
      {
        onSuccess: (result) => {
          onOpenChange(false);
          onSent(result.emailAddress);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Invite teammate</DialogTitle>
          <DialogDescription>
            Send an email invite. Work domain, title, and GitHub are applied when they
            join — no extra setup needed.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="grid gap-3">
          <Field id={emailId} label="Work email">
            <div className="relative">
              <MailIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="pl-9"
                autoComplete="email"
                autoFocus
              />
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={domainIdField} label="Work domain">
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger id={domainIdField} className="w-full">
                  <SelectValue placeholder="Choose domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_DOMAIN}>Unassigned</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id={accessId} label="Access">
              <RoleSelect
                value={appRole}
                onChange={setAppRole}
                id={accessId}
                className="w-full"
              />
            </Field>
          </div>

          <Field id={titleId} label="Job title">
            <Input
              id={titleId}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Backend Engineer"
              autoComplete="organization-title"
            />
          </Field>

          <Field id={githubId} label="GitHub">
            <div className="relative">
              <AtSignIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={githubId}
                value={githubHandle}
                onChange={(e) => setGithubHandle(e.target.value)}
                placeholder="octocat"
                className="pl-9"
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </Field>

          {invite.isError && (
            <p className="text-sm text-destructive">{getApiErrorMessage(invite.error)}</p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={invite.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={invite.isPending || !email.trim()}
          >
            {invite.isPending ? "Sending…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({
  employee,
  open,
  onOpenChange,
  domains,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
}) {
  const updateEmployee = useUpdateEmployee();
  const formId = useId();
  const nameId = `${formId}-name`;
  const titleId = `${formId}-title`;
  const domainIdField = `${formId}-domain`;
  const githubId = `${formId}-github`;

  const [name, setName] = useState(employee.name);
  const [jobTitle, setJobTitle] = useState(employee.role ?? "");
  const [domainId, setDomainId] = useState(employee.domainId ?? NONE_DOMAIN);
  const [githubHandle, setGithubHandle] = useState(employee.githubHandle ?? "");

  useEffect(() => {
    if (!open) return;
    setName(employee.name);
    setJobTitle(employee.role ?? "");
    setDomainId(employee.domainId ?? NONE_DOMAIN);
    setGithubHandle(employee.githubHandle ?? "");
  }, [open, employee.name, employee.role, employee.domainId, employee.githubHandle]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const nextTitle = jobTitle.trim() || null;
    const nextGithub = githubHandle.trim().replace(/^@/, "") || null;
    const nextDomainId = domainId === NONE_DOMAIN ? null : domainId;

    updateEmployee.mutate(
      {
        id: employee.id,
        input: {
          name: trimmedName,
          role: nextTitle,
          githubHandle: nextGithub,
          domainId: nextDomainId,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update profile details, work domain, and GitHub handle for skill-graph matching.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={handleSubmit} className="grid gap-3">
          <Field id={nameId} label="Display name">
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Jane Doe"
            />
          </Field>

          <Field id={titleId} label="Job title">
            <Input
              id={titleId}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Backend Engineer"
              autoComplete="organization-title"
            />
          </Field>

          <Field id={domainIdField} label="Domain">
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger id={domainIdField} className="w-full">
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_DOMAIN}>No domain</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id={githubId} label="GitHub handle">
            <div className="relative">
              <AtSignIcon
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id={githubId}
                value={githubHandle}
                onChange={(e) => setGithubHandle(e.target.value)}
                placeholder="octocat"
                className="pl-9"
                autoComplete="username"
                spellCheck={false}
              />
            </div>
          </Field>

          {updateEmployee.isError && (
            <p className="text-sm text-destructive">
              {getApiErrorMessage(updateEmployee.error)}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateEmployee.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={updateEmployee.isPending || !name.trim()}>
            {updateEmployee.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DomainRow({ domain }: { domain: OrgDomain }) {
  const updateDomain = useUpdateOrgDomain();
  const deleteDomain = useDeleteOrgDomain();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(domain.name);
  const inputId = useId();

  useEffect(() => {
    if (!editing) setDraft(domain.name);
  }, [domain.name, editing]);

  function startEditing() {
    setDraft(domain.name);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(domain.name);
    setEditing(false);
    updateDomain.reset();
  }

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed === domain.name) {
      setEditing(false);
      return;
    }
    updateDomain.mutate(
      { id: domain.id, input: { name: trimmed } },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50">
      {editing ? (
        <>
          <Input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
            aria-label={`Rename ${domain.name}`}
            className="h-8 flex-1"
            autoFocus
            disabled={updateDomain.isPending}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Save name"
            disabled={updateDomain.isPending || !draft.trim()}
            onClick={save}
          >
            <CheckIcon className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cancel rename"
            disabled={updateDomain.isPending}
            onClick={cancelEditing}
          >
            <XIcon className="size-3.5" />
          </Button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{domain.name}</span>
          {domain.isDefault && (
            <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[0.625rem]">
              Built-in
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Rename ${domain.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={startEditing}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          {!domain.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${domain.name}`}
              className="text-muted-foreground hover:text-destructive"
              disabled={deleteDomain.isPending}
              onClick={() => deleteDomain.mutate(domain.id)}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          )}
        </>
      )}
      {updateDomain.isError && (
        <p className="basis-full text-xs text-destructive">
          {getApiErrorMessage(updateDomain.error)}
        </p>
      )}
      {deleteDomain.isError && (
        <p className="basis-full text-xs text-destructive">
          {getApiErrorMessage(deleteDomain.error)}
        </p>
      )}
    </li>
  );
}

function ManageDomainsDialog({
  open,
  onOpenChange,
  domains,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
}) {
  const createDomain = useCreateOrgDomain();
  const formId = useId();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createDomain.mutate(
      { name: trimmed },
      {
        onSuccess: () => setName(""),
      },
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) createDomain.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Manage domains</DialogTitle>
          <DialogDescription>
            Labels for people on your team (Design, Engineering, …). Rename
            freely — built-ins can’t be deleted.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(24rem,50vh)] space-y-0.5 overflow-y-auto rounded-lg border border-border p-1.5">
          {domains.map((domain) => (
            <DomainRow key={domain.id} domain={domain} />
          ))}
        </ul>

        <form
          id={formId}
          onSubmit={handleCreate}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a custom domain…"
            aria-label="New domain name"
            className="sm:flex-1"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={createDomain.isPending || !name.trim()}
          >
            <PlusIcon className="size-4" />
            {createDomain.isPending ? "Adding…" : "Add"}
          </Button>
        </form>

        {createDomain.isError && (
          <p className="text-sm text-destructive">{getApiErrorMessage(createDomain.error)}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  employee,
  isSelf,
  domains,
}: {
  employee: Employee;
  isSelf: boolean;
  domains: OrgDomain[];
}) {
  const updateEmployee = useUpdateEmployee();
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);
  const [editing, setEditing] = useState(false);

  function handleRoleChange(appRole: AppRole) {
    if (appRole === employee.appRole) return;
    setPendingRole(appRole);
    updateEmployee.mutate(
      { id: employee.id, input: { appRole } },
      {
        onSettled: () => setPendingRole(null),
      },
    );
  }

  const displayRole = pendingRole ?? employee.appRole;
  const jobTitle = employee.role?.trim() || null;
  const github = employee.githubHandle?.trim() || null;
  const domainLabel = employee.domainName?.trim() || null;

  return (
    <li
      className={cn(
        "group/row flex flex-col gap-3 rounded-xl px-3 py-3.5 transition-colors duration-150",
        "hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold tracking-wide",
            employee.appRole === "admin"
              ? "bg-brand-honey-soft text-brand-honey"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials(employee.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium leading-snug">
            {employee.name}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
            )}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {[domainLabel, jobTitle ?? "No job title"].filter(Boolean).join(" · ")}
          </p>
          {github && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <AtSignIcon className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{github}</span>
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 pl-12 sm:pl-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${employee.name}`}
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <PencilIcon />
        </Button>
        <RoleSelect
          value={displayRole}
          onChange={handleRoleChange}
          disabled={updateEmployee.isPending}
          id={`role-${employee.id}`}
          size="sm"
        />
      </div>
      {updateEmployee.isError && (
        <p className="text-sm text-destructive sm:basis-full sm:pl-12">
          {getApiErrorMessage(updateEmployee.error)}
        </p>
      )}

      <EditMemberDialog
        employee={employee}
        open={editing}
        onOpenChange={setEditing}
        domains={domains}
      />
    </li>
  );
}

export function TeamPanel() {
  const { isAdmin, isLoading: roleLoading, employeeId } = useAppRole();
  const employeesQuery = useEmployees();
  const domainsQuery = useOrgDomains();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const employees = employeesQuery.data ?? [];
  const domains = domainsQuery.data ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  const domainFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All domains" },
      { value: "unassigned" as const, label: "No domain" },
      ...domains.map((d) => ({ value: d.id, label: d.name })),
    ],
    [domains],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matchesEmployee(employee, normalizedQuery, roleFilter, profileFilter, domainFilter),
      ),
    [employees, normalizedQuery, roleFilter, profileFilter, domainFilter],
  );

  const hasActiveFilters =
    normalizedQuery.length > 0 ||
    roleFilter !== "all" ||
    profileFilter !== "all" ||
    domainFilter !== "all";

  function clearFilters() {
    setQuery("");
    setRoleFilter("all");
    setProfileFilter("all");
    setDomainFilter("all");
  }

  if (roleLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center shadow-soft">
        <p className="font-medium">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Ask an organization admin to manage team access.
        </p>
        <Button className="mt-5" variant="outline" asChild>
          <Link href="/">Back to workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1.5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-balance">
            Team
          </h1>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            Invite people, assign domains, and set who can manage the workspace.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDomainsOpen(true)}
            disabled={domainsQuery.isLoading || domainsQuery.isError}
          >
            Domains
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setInviteMessage(null);
              setInviteOpen(true);
            }}
          >
            <PlusIcon className="size-3.5" strokeWidth={1.75} />
            Invite
          </Button>
        </div>
      </header>

      {inviteMessage && (
        <p
          role="status"
          className="flex items-center gap-1.5 rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success"
        >
          <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden />
          {inviteMessage}
        </p>
      )}

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        domains={domains}
        onSent={(emailAddress) => {
          setInviteMessage(`Invitation sent to ${emailAddress}`);
        }}
      />

      <ManageDomainsDialog
        open={domainsOpen}
        onOpenChange={setDomainsOpen}
        domains={domains}
      />

      <section className="space-y-3" aria-labelledby="members-heading">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="members-heading" className="text-sm font-semibold">
            People
          </h2>
          {!employeesQuery.isLoading && !employeesQuery.isError && employees.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {hasActiveFilters
                ? `${filteredEmployees.length} of ${employees.length}`
                : `${employees.length} ${employees.length === 1 ? "person" : "people"}`}
            </span>
          )}
        </div>

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 basis-48">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, title, or GitHub…"
                aria-label="Search people"
                className="pl-9"
              />
            </div>

            <FilterSelect
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLE_FILTERS}
              aria-label="Filter by app role"
            />
            <FilterSelect
              value={domainFilter}
              onChange={setDomainFilter}
              options={domainFilterOptions}
              aria-label="Filter by domain"
            />
            <FilterSelect
              value={profileFilter}
              onChange={setProfileFilter}
              options={PROFILE_FILTERS}
              aria-label="Filter by profile completeness"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {employeesQuery.isLoading && (
          <div className="space-y-2 rounded-xl border border-border p-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        )}

        {employeesQuery.isError && (
          <p className="rounded-xl border border-border px-4 py-6 text-sm text-muted-foreground">
            Could not load people ({getApiErrorMessage(employeesQuery.error)}).
          </p>
        )}

        {!employeesQuery.isLoading && !employeesQuery.isError && employees.length === 0 && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No one here yet. Invite someone to get started.
          </p>
        )}

        {!employeesQuery.isLoading &&
          !employeesQuery.isError &&
          employees.length > 0 &&
          filteredEmployees.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No one matches your search or filters.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

        {!employeesQuery.isLoading &&
          !employeesQuery.isError &&
          filteredEmployees.length > 0 && (
            <ul className="rounded-xl border border-border bg-card p-1.5 shadow-soft">
              {filteredEmployees.map((employee) => (
                <MemberRow
                  key={employee.id}
                  employee={employee}
                  isSelf={employee.id === employeeId}
                  domains={domains}
                />
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
