"use client";

import { AtSignIcon, BriefcaseIcon, FolderIcon, ShieldIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import { Field } from "@/components/team/field";
import { RoleSelect } from "@/components/team/role-select";
import {
  displayJobTitle,
  initials,
  NONE_DOMAIN,
  ROLE_META,
} from "@/components/team/team-constants";
import { useUpdateEmployee } from "@/hooks/queries/employee/employee.mutations";
import { getApiErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { AppRole, Employee } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

/** Read-only profile summary shown at the top of the dialog; badges reflect the in-flight edits. */
function MemberSummary({
  employee,
  isSelf,
  appRole,
  domainName,
}: {
  employee: Employee;
  isSelf: boolean;
  appRole: AppRole;
  domainName: string | null | undefined;
}) {
  const roleMeta = ROLE_META[appRole];
  return (
    <DialogHeader className="gap-4 sm:text-left">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-wide",
            employee.appRole === "admin"
              ? "bg-brand-honey-soft text-brand-honey"
              : "bg-muted text-muted-foreground",
          )}
        >
          {initials(employee.name)}
        </span>
        <div className="min-w-0 space-y-1.5">
          <DialogTitle className="truncate leading-tight">
            {employee.name}
            {isSelf && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">(you)</span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and update profile details for {employee.name}.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className={cn(
                appRole === "admin" && "border-primary/25 bg-primary/10 text-foreground",
              )}
            >
              <roleMeta.Icon className="size-3" aria-hidden />
              {roleMeta.label}
            </Badge>
            {domainName && (
              <Badge variant="outline" className="font-normal">
                <FolderIcon className="size-3" aria-hidden />
                {domainName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ul className="grid gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm">
        <DetailRow
          icon={<ShieldIcon className="size-3.5" aria-hidden />}
          label="Access"
          value={`${roleMeta.label} — ${roleMeta.description}`}
        />
        <DetailRow
          icon={<BriefcaseIcon className="size-3.5" aria-hidden />}
          label="Title"
          value={displayJobTitle(employee.role) ?? "Not set"}
        />
        <DetailRow
          icon={<FolderIcon className="size-3.5" aria-hidden />}
          label="Domain"
          value={employee.domainName?.trim() || "Unassigned"}
        />
        <DetailRow
          icon={<AtSignIcon className="size-3.5" aria-hidden />}
          label="GitHub"
          value={employee.githubHandle?.trim() ? `@${employee.githubHandle.trim()}` : "Not set"}
        />
      </ul>
    </DialogHeader>
  );
}

/** The editable profile fields; all state lives in the parent dialog. */
function EditProfileFields({
  form,
  onChange,
  domains,
  pending,
}: {
  form: {
    name: string;
    jobTitle: string;
    domainId: string;
    githubHandle: string;
    appRole: AppRole;
  };
  onChange: {
    name: (value: string) => void;
    jobTitle: (value: string) => void;
    domainId: (value: string) => void;
    githubHandle: (value: string) => void;
    appRole: (value: AppRole) => void;
  };
  domains: OrgDomain[];
  pending: boolean;
}) {
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const titleId = `${fieldId}-title`;
  const domainIdField = `${fieldId}-domain`;
  const githubId = `${fieldId}-github`;
  const accessId = `${fieldId}-access`;

  return (
    <>
      <Field id={nameId} label="Display name">
        <Input
          id={nameId}
          value={form.name}
          onChange={(e) => onChange.name(e.target.value)}
          required
          autoComplete="name"
          placeholder="Jane Doe"
        />
      </Field>

      <Field id={titleId} label="Job title">
        <Input
          id={titleId}
          value={form.jobTitle}
          onChange={(e) => onChange.jobTitle(e.target.value)}
          placeholder="Backend Engineer"
          autoComplete="organization-title"
        />
      </Field>

      <Field id={domainIdField} label="Domain">
        <Select value={form.domainId} onValueChange={onChange.domainId}>
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
            value={form.githubHandle}
            onChange={(e) => onChange.githubHandle(e.target.value)}
            placeholder="octocat"
            className="pl-9"
            autoComplete="username"
            spellCheck={false}
          />
        </div>
      </Field>

      <Field id={accessId} label="Workspace access">
        <RoleSelect
          id={accessId}
          value={form.appRole}
          onChange={onChange.appRole}
          disabled={pending}
          className="w-full"
        />
      </Field>
    </>
  );
}

export function EditMemberDialog({
  employee,
  open,
  onOpenChange,
  domains,
  isSelf = false,
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
  isSelf?: boolean;
}) {
  const updateEmployee = useUpdateEmployee();
  const formId = useId();

  const [name, setName] = useState(employee.name);
  const [jobTitle, setJobTitle] = useState(displayJobTitle(employee.role) ?? "");
  const [domainId, setDomainId] = useState(employee.domainId ?? NONE_DOMAIN);
  const [githubHandle, setGithubHandle] = useState(employee.githubHandle ?? "");
  const [appRole, setAppRole] = useState<AppRole>(employee.appRole);

  useEffect(() => {
    if (!open) return;
    setName(employee.name);
    setJobTitle(displayJobTitle(employee.role) ?? "");
    setDomainId(employee.domainId ?? NONE_DOMAIN);
    setGithubHandle(employee.githubHandle ?? "");
    setAppRole(employee.appRole);
  }, [
    open,
    employee.name,
    employee.role,
    employee.domainId,
    employee.githubHandle,
    employee.appRole,
  ]);

  const domainName =
    domains.find((d) => d.id === (domainId === NONE_DOMAIN ? null : domainId))?.name ??
    employee.domainName;

  function handleSubmit(event: FormEvent) {
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
          appRole,
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
        <MemberSummary
          employee={employee}
          isSelf={isSelf}
          appRole={appRole}
          domainName={domainName}
        />

        <form id={formId} onSubmit={handleSubmit} className="grid gap-3">
          <p className="text-xs font-medium text-muted-foreground">Edit profile</p>

          <EditProfileFields
            form={{ name, jobTitle, domainId, githubHandle, appRole }}
            onChange={{
              name: setName,
              jobTitle: setJobTitle,
              domainId: setDomainId,
              githubHandle: setGithubHandle,
              appRole: setAppRole,
            }}
            domains={domains}
            pending={updateEmployee.isPending}
          />

          {updateEmployee.isError && (
            <p className="text-sm text-destructive">{getApiErrorMessage(updateEmployee.error)}</p>
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

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <p className="truncate text-foreground text-pretty">{value}</p>
      </span>
    </li>
  );
}
