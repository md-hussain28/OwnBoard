"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  useCreateQuizDomain,
  useDeleteQuizDomain,
  useQuizDomains,
} from "@/hooks/queries/quiz-domain/quiz-domain.queries";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/errors";

type QuizDomainsFieldProps = {
  /** Selected domain id, or `null` for no domain. */
  value: string | null;
  onChange: (domainId: string | null) => void;
};

/**
 * Domain picker + manager for the create-quiz flow: pick a topic label,
 * add a custom one, or remove a non-default. Built-ins stay.
 */
export function QuizDomainsField({ value, onChange }: QuizDomainsFieldProps) {
  const domainsQuery = useQuizDomains();
  const createDomain = useCreateQuizDomain();
  const deleteDomain = useDeleteQuizDomain();
  const [name, setName] = useState("");

  const domains = domainsQuery.data ?? [];

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createDomain.mutate(
      { name: trimmed },
      {
        onSuccess: (domain) => {
          setName("");
          onChange(domain.id);
        },
      },
    );
  }

  function handleDelete(domainId: string) {
    deleteDomain.mutate(domainId, {
      onSuccess: () => {
        if (value === domainId) onChange(null);
      },
    });
  }

  if (domainsQuery.isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-3" aria-labelledby="quiz-domains-heading">
      <div className="space-y-0.5">
        <h2 id="quiz-domains-heading" className="text-sm font-medium">
          Domain{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </h2>
        <p className="text-xs text-muted-foreground text-pretty">
          Label this quiz by topic (Policy, Holiday, …). Built-ins stay; add custom ones anytime.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        <li>
          <button
            type="button"
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            className={cn(
              "inline-flex items-center rounded-lg border px-2.5 py-1 text-sm transition-colors",
              value === null
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            None
          </button>
        </li>
        {domains.map((domain) => {
          const selected = value === domain.id;
          return (
            <li key={domain.id}>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(domain.id)}
                  className="text-left"
                >
                  {domain.name}
                </button>
                {domain.isDefault ? (
                  <Badge variant="secondary" className="ml-0.5 h-4 px-1.5 text-[0.625rem]">
                    Default
                  </Badge>
                ) : (
                  <button
                    type="button"
                    aria-label={`Delete ${domain.name}`}
                    className="ml-0.5 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
                    disabled={deleteDomain.isPending}
                    onClick={() => handleDelete(domain.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Add a domain…"
          aria-label="New quiz domain name"
          className="sm:flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={createDomain.isPending || !name.trim()}
          onClick={handleCreate}
        >
          <PlusIcon className="size-4" />
          {createDomain.isPending ? "Adding…" : "Add domain"}
        </Button>
      </div>

      {domainsQuery.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(domainsQuery.error)}</p>
      )}
      {createDomain.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(createDomain.error)}</p>
      )}
      {deleteDomain.isError && (
        <p className="text-sm text-destructive">{getApiErrorMessage(deleteDomain.error)}</p>
      )}
    </div>
  );
}
