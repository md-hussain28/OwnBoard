"use client";

import { AtSignIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Field } from "@/components/team/field";
import { RoleSelect } from "@/components/team/role-select";
import { NONE_DOMAIN } from "@/components/team/team-constants";
import { useUpdateEmployee } from "@/hooks/queries/employee/employee.mutations";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { Employee } from "@/schemas/employee.schema";
import type { OrgDomain } from "@/schemas/org-domain.schema";
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

export function EditMemberDialog({
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
