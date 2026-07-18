"use client";

import { AtSignIcon, MailIcon } from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useInviteEmployee } from "@/hooks/queries/employee";
import { notify } from "@/lib";
import type { AppRole, OrgDomain } from "@/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from "@/ui";
import { Field } from "./field";
import { RoleSelect } from "./role-select";
import { NONE_DOMAIN } from "./team-constants";

export function InviteMemberDialog({
  open,
  onOpenChange,
  domains,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domains: OrgDomain[];
  onSent?: (email: string) => void;
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

  function handleSubmit(event: FormEvent) {
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
          notify.success("Invitation sent", {
            description: result.emailAddress,
            id: `invite:${result.emailAddress}`,
          });
          onSent?.(result.emailAddress);
        },
        onError: (err) => {
          notify.apiError(err, "Could not send invitation", { id: `invite-error:${trimmed}` });
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
            Send an email invite. Work domain, title, and GitHub are applied when they join — no
            extra setup needed.
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
              <RoleSelect value={appRole} onChange={setAppRole} id={accessId} className="w-full" />
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
          <Button type="submit" form={formId} disabled={invite.isPending || !email.trim()}>
            {invite.isPending && <Spinner />}
            {invite.isPending ? "Sending…" : "Send invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
