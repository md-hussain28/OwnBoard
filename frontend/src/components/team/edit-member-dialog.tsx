"use client";

import { AtSignIcon, BriefcaseIcon, FolderIcon, PencilIcon, ShieldIcon } from "lucide-react";
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
import { notify } from "@/lib/toast";
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

export type MemberDialogMode = "view" | "edit";

/** Compact header shared by view and edit modes. */
function MemberHeader({
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
    <DialogHeader className="gap-2 sm:text-left">
      <div className="flex items-center gap-2.5">
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
        <div className="min-w-0 space-y-1">
          <DialogTitle className="truncate text-base leading-tight">
            {employee.name}
            {isSelf && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">(you)</span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Profile details for {employee.name}.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-1">
            <Badge
              variant="secondary"
              className={cn(
                "h-5 gap-1 px-1.5 text-[0.6875rem]",
                appRole === "admin" && "border-primary/25 bg-primary/10 text-foreground",
              )}
            >
              <roleMeta.Icon className="size-2.5" aria-hidden />
              {roleMeta.label}
            </Badge>
            {domainName && (
              <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[0.6875rem] font-normal">
                <FolderIcon className="size-2.5" aria-hidden />
                {domainName}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </DialogHeader>
  );
}

/** Read-only profile facts — view mode only. */
function MemberDetails({ employee, appRole }: { employee: Employee; appRole: AppRole }) {
  const roleMeta = ROLE_META[appRole];
  return (
    <ul className="grid gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm">
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
  );
}

/** Editable profile fields; all state lives in the parent dialog. */
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
    <div className="grid gap-2.5">
      <Field id={nameId} label="Display name">
        <Input
          id={nameId}
          value={form.name}
          onChange={(e) => onChange.name(e.target.value)}
          required
          autoComplete="name"
          placeholder="Jane Doe"
          className="h-8"
        />
      </Field>

      <Field id={titleId} label="Job title">
        <Input
          id={titleId}
          value={form.jobTitle}
          onChange={(e) => onChange.jobTitle(e.target.value)}
          placeholder="Backend Engineer"
          autoComplete="organization-title"
          className="h-8"
        />
      </Field>

      <Field id={domainIdField} label="Domain">
        <Select value={form.domainId} onValueChange={onChange.domainId}>
          <SelectTrigger id={domainIdField} className="h-8 w-full">
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
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={githubId}
            value={form.githubHandle}
            onChange={(e) => onChange.githubHandle(e.target.value)}
            placeholder="octocat"
            className="h-8 pl-8"
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
    </div>
  );
}

export function EditMemberDialog({
  employee,
  open,
  onOpenChange,
  domains,
  isSelf = false,
  initialMode = "view",
}: {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
  isSelf?: boolean;
  /** How the dialog should open. Row click → view; pencil → edit. */
  initialMode?: MemberDialogMode;
}) {
  const updateEmployee = useUpdateEmployee();
  const formId = useId();

  const [mode, setMode] = useState<MemberDialogMode>(initialMode);
  const [name, setName] = useState(employee.name);
  const [jobTitle, setJobTitle] = useState(displayJobTitle(employee.role) ?? "");
  const [domainId, setDomainId] = useState(employee.domainId ?? NONE_DOMAIN);
  const [githubHandle, setGithubHandle] = useState(employee.githubHandle ?? "");
  const [appRole, setAppRole] = useState<AppRole>(employee.appRole);

  function resetForm() {
    setName(employee.name);
    setJobTitle(displayJobTitle(employee.role) ?? "");
    setDomainId(employee.domainId ?? NONE_DOMAIN);
    setGithubHandle(employee.githubHandle ?? "");
    setAppRole(employee.appRole);
  }

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setName(employee.name);
    setJobTitle(displayJobTitle(employee.role) ?? "");
    setDomainId(employee.domainId ?? NONE_DOMAIN);
    setGithubHandle(employee.githubHandle ?? "");
    setAppRole(employee.appRole);
  }, [
    open,
    initialMode,
    employee.name,
    employee.role,
    employee.domainId,
    employee.githubHandle,
    employee.appRole,
  ]);

  const domainName =
    domains.find((d) => d.id === (domainId === NONE_DOMAIN ? null : domainId))?.name ??
    employee.domainName;

  function enterEdit() {
    resetForm();
    setMode("edit");
  }

  function cancelEdit() {
    resetForm();
    if (initialMode === "edit") {
      onOpenChange(false);
      return;
    }
    setMode("view");
  }

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
        onSuccess: () => {
          notify.success("Member updated", {
            description: trimmedName,
            id: `member:${employee.id}`,
          });
          onOpenChange(false);
        },
        onError: (err) => {
          notify.apiError(err, "Could not save member", { id: `member-error:${employee.id}` });
        },
      },
    );
  }

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-sm" showCloseButton>
        <MemberHeader
          employee={employee}
          isSelf={isSelf}
          appRole={isEdit ? appRole : employee.appRole}
          domainName={isEdit ? domainName : employee.domainName}
        />

        {isEdit ? (
          <form id={formId} onSubmit={handleSubmit}>
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
          </form>
        ) : (
          <MemberDetails employee={employee} appRole={employee.appRole} />
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {isEdit ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                disabled={updateEmployee.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form={formId}
                disabled={updateEmployee.isPending || !name.trim()}
              >
                {updateEmployee.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button type="button" onClick={enterEdit}>
                <PencilIcon className="size-3.5" aria-hidden />
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-2 py-0.5">
      <span className="mt-0.5 shrink-0 self-start text-muted-foreground">{icon}</span>
      <span className="w-14 shrink-0 text-xs text-muted-foreground">{label}</span>
      <p className="min-w-0 flex-1 truncate text-sm text-foreground text-pretty leading-snug">
        {value}
      </p>
    </li>
  );
}
