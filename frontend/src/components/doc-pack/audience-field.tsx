"use client";

import { CheckIcon, GlobeIcon, Loader2Icon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAudiencePreview } from "@/hooks/queries/doc-pack";
import { useOrgDomains } from "@/hooks/queries/org-domain";
import { cn } from "@/lib";
import type { AudiencePreview } from "@/schemas";
import { Skeleton } from "@/ui";

type AudienceFieldProps = {
  /** Everyone in the org (ignores domain selection while true). */
  assignToAll: boolean;
  /** Selected OrgDomain ids when not assigning to everyone. */
  domainIds: string[];
  onAssignToAllChange: (value: boolean) => void;
  onDomainIdsChange: (ids: string[]) => void;
};

/**
 * Live, debounced dry-run of how many employees the current audience selection resolves to.
 * Pure display: it never mutates parent state, only previews the effect of the current choice.
 */
function AssignmentPreview({
  assignToAll,
  domainIds,
}: {
  assignToAll: boolean;
  domainIds: string[];
}) {
  const preview = useAudiencePreview();
  const { mutateAsync } = preview;
  const [result, setResult] = useState<AudiencePreview | null>(null);
  const [loading, setLoading] = useState(false);

  const manualOnly = !assignToAll && domainIds.length === 0;
  const domainKey = domainIds.join(",");

  useEffect(() => {
    if (manualOnly) {
      setResult(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const selectedDomainIds = domainKey ? domainKey.split(",") : [];
    const handle = setTimeout(() => {
      mutateAsync({
        assign_to_all: assignToAll,
        audience_domain_ids: assignToAll ? [] : selectedDomainIds,
      })
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch(() => {
          if (!cancelled) setResult(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [assignToAll, domainKey, manualOnly, mutateAsync]);

  if (manualOnly) {
    return (
      <p className="text-xs text-muted-foreground">
        Manual assignment only — no one is auto-assigned.
      </p>
    );
  }

  if (loading && !result) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
        Checking who this reaches…
      </p>
    );
  }

  if (!result) return null;

  const names = result.sampleNames.slice(0, 3);
  const extra = result.count - names.length;

  return (
    <p className={cn("text-xs text-muted-foreground", loading && "opacity-70")}>
      This will auto-assign to{" "}
      <span className="font-medium text-foreground">
        {result.count} {result.count === 1 ? "employee" : "employees"}
      </span>
      {names.length > 0 && (
        <>
          {" — e.g. "}
          {names.join(", ")}
          {extra > 0 && `, +${extra} more`}
        </>
      )}
    </p>
  );
}

/**
 * Audience targeting for a Track: everyone in the org, or specific employee domains
 * (Sales, Marketing, …). Whoever matches is auto-assigned once the quiz is published — new
 * hires in a matching domain get it automatically too. Manual assignment still works on top.
 */
export function AudienceField({
  assignToAll,
  domainIds,
  onAssignToAllChange,
  onDomainIdsChange,
}: AudienceFieldProps) {
  const domainsQuery = useOrgDomains();
  const domains = domainsQuery.data ?? [];

  function toggleDomain(id: string) {
    onDomainIdsChange(
      domainIds.includes(id) ? domainIds.filter((d) => d !== id) : [...domainIds, id],
    );
  }

  return (
    <div className="space-y-3" aria-labelledby="audience-heading">
      <div className="space-y-0.5">
        <h2 id="audience-heading" className="text-sm font-medium">
          Audience <span className="font-normal text-muted-foreground">(auto-assign)</span>
        </h2>
        <p className="text-xs text-muted-foreground text-pretty">
          Once this module&apos;s quiz is published, everyone here is assigned automatically —
          including new hires who join a matching domain later. You can still assign extra people by
          hand.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={assignToAll}
          onClick={() => onAssignToAllChange(true)}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
            assignToAll
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <GlobeIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              assignToAll ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Everyone in the org</span>
            <span className="block text-xs text-muted-foreground">
              All current and future members.
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={!assignToAll}
          onClick={() => onAssignToAllChange(false)}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
            !assignToAll
              ? "border-primary/50 bg-primary/5"
              : "border-border bg-background hover:bg-muted",
          )}
        >
          <UsersIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              !assignToAll ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Specific domains</span>
            <span className="block text-xs text-muted-foreground">
              Only the domains you pick below.
            </span>
          </span>
        </button>
      </div>

      {!assignToAll && (
        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          {domainsQuery.isLoading && <Skeleton className="h-7 w-full" />}
          {!domainsQuery.isLoading && domains.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No domains yet. Add them under Team → domains, then pick them here.
            </p>
          )}
          {!domainsQuery.isLoading && domains.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {domains.map((domain) => {
                const selected = domainIds.includes(domain.id);
                return (
                  <li key={domain.id}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleDomain(domain.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors",
                        selected
                          ? "border-brand-teal/50 bg-accent text-accent-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {selected && <CheckIcon className="size-3.5" />}
                      {domain.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!domainsQuery.isLoading && domains.length > 0 && domainIds.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Pick at least one domain, or switch to “Everyone”. With nothing selected this module
              is manual-assign only.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-brand-teal/25 bg-accent/30 px-3 py-2">
        <AssignmentPreview assignToAll={assignToAll} domainIds={domainIds} />
      </div>
    </div>
  );
}
