"use client";

import { PencilIcon, PlusIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { usePackAssignmentProgress } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useQuizDomains } from "@/hooks/queries/quiz-domain/quiz-domain.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import type { DocPackListItem } from "@/schemas/docPack.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Skeleton } from "@/ui/skeleton";

type PackStatus = DocPackListItem["status"];
type StatusFilter = "all" | PackStatus;
type AssignmentFilter = "all" | "assigned" | "unassigned";
type DomainFilter = "all" | "none" | string;

const STATUS_LABEL: Record<PackStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "needs_review", label: "Needs review" },
  { value: "archived", label: "Archived" },
];

const ASSIGNMENT_FILTERS: { value: AssignmentFilter; label: string }[] = [
  { value: "all", label: "Anyone" },
  { value: "assigned", label: "Assigned" },
  { value: "unassigned", label: "Unassigned" },
];

function packStatusVariant(status: PackStatus) {
  if (status === "active") return "success" as const;
  if (status === "needs_review") return "warning" as const;
  if (status === "archived") return "outline" as const;
  return "secondary" as const;
}

export function QuizPackList({ onAssignPack }: { onAssignPack: (packId: string) => void }) {
  const { isAdmin } = useAppRole();
  const { data: packs, isLoading, isError, error } = useDocPacks();
  const domainsQuery = useQuizDomains({ enabled: isAdmin });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("all");

  const packIds = useMemo(() => (packs ?? []).map((p) => p.id), [packs]);
  const domains = domainsQuery.data ?? [];
  const progressByPackId = usePackAssignmentProgress(packIds, isAdmin);

  const domainFilters: { value: DomainFilter; label: string }[] = useMemo(
    () => [
      { value: "all", label: "All domains" },
      { value: "none", label: "No domain" },
      ...domains.map((d) => ({ value: d.id, label: d.name })),
    ],
    [domains],
  );

  const filteredPacks = useMemo(() => {
    const list = packs ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((pack) => {
      if (statusFilter !== "all" && pack.status !== statusFilter) return false;

      if (domainFilter === "none") {
        if (pack.domainId) return false;
      } else if (domainFilter !== "all" && pack.domainId !== domainFilter) {
        return false;
      }

      if (assignmentFilter !== "all") {
        const progress = progressByPackId.get(pack.id);
        const assigned = (progress?.count ?? 0) > 0;
        if (assignmentFilter === "assigned" && !assigned) return false;
        if (assignmentFilter === "unassigned" && assigned) return false;
      }

      if (!q) return true;
      const haystack = [
        pack.name,
        pack.description ?? "",
        pack.domainName ?? "",
        STATUS_LABEL[pack.status],
        pack.status.replace("_", " "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packs, query, statusFilter, assignmentFilter, domainFilter, progressByPackId]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    statusFilter !== "all" ||
    assignmentFilter !== "all" ||
    domainFilter !== "all";

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setAssignmentFilter("all");
    setDomainFilter("all");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Quizzes</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "Every pack you can assign. Open Assign to pick people and see who has passed."
              : "Published quizzes in your organization. Your assigned reading is under Readiness."}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/doc-packs/new">
              <PlusIcon className="size-4" />
              Create quiz
            </Link>
          </Button>
        )}
      </div>

      {!isLoading && !isError && (packs?.length ?? 0) > 0 && (
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
              placeholder="Search quizzes…"
              aria-label="Search quizzes"
              className="pl-9"
            />
          </div>

          <FilterSelect
            value={domainFilter}
            onChange={setDomainFilter}
            options={domainFilters}
            aria-label="Filter by domain"
          />
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS}
            aria-label="Filter by status"
          />
          {isAdmin && (
            <FilterSelect
              value={assignmentFilter}
              onChange={setAssignmentFilter}
              options={ASSIGNMENT_FILTERS}
              aria-label="Filter by assignment"
            />
          )}

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

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground">
          Could not reach the backend ({getApiErrorMessage(error)}). Start the FastAPI service and
          refresh.
        </p>
      )}

      {!isLoading && !isError && packs?.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground text-pretty">
            {isAdmin
              ? "No quizzes yet. Create one to upload documents and generate a cited quiz, then assign it to hires from this list."
              : "No quizzes yet. An admin will create and assign them."}
          </p>
          {isAdmin && (
            <Button asChild>
              <Link href="/doc-packs/new">Create your first quiz</Link>
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && packs && packs.length > 0 && filteredPacks.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {query.trim()
              ? `No quizzes match “${query.trim()}” with the current filters.`
              : "No quizzes match the current filters."}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {!isLoading && !isError && filteredPacks.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-background shadow-soft">
          {filteredPacks.map((pack) => {
            const progress = progressByPackId.get(pack.id);
            return (
              <li
                key={pack.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{pack.name}</p>
                    {pack.domainName && <Badge variant="outline">{pack.domainName}</Badge>}
                    <Badge variant={packStatusVariant(pack.status)}>
                      {STATUS_LABEL[pack.status]}
                    </Badge>
                  </div>
                  {pack.description && (
                    <p className="truncate text-sm text-muted-foreground">{pack.description}</p>
                  )}
                  {isAdmin &&
                    (progress?.loading ? (
                      <Skeleton className="h-3 w-36" />
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {progress?.text ?? "Not assigned yet"}
                        {progress && progress.count > 0
                          ? ` · ${progress.count} ${progress.count === 1 ? "person" : "people"}`
                          : ""}
                      </p>
                    ))}
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" size="sm" onClick={() => onAssignPack(pack.id)}>
                      <UserPlusIcon className="size-3.5" />
                      Assign
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/doc-packs/${pack.id}`}>
                        <PencilIcon className="size-3.5" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
