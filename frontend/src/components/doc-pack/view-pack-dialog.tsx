"use client";

import { CalendarIcon, FolderIcon, PencilIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PackAssignmentProgress } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import type { DocPackListItem } from "@/schemas/docPack.schema";
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
import { Skeleton } from "@/ui/skeleton";

type PackStatus = DocPackListItem["status"];

const STATUS_LABEL: Record<PackStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

function packStatusVariant(status: PackStatus) {
  if (status === "active") return "success" as const;
  if (status === "needs_review") return "warning" as const;
  if (status === "archived") return "outline" as const;
  return "secondary" as const;
}

function formatCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function assignmentSummary(progress: PackAssignmentProgress | undefined) {
  if (progress?.loading) return null;
  if (!progress || progress.count === 0) return "Not assigned yet";
  return `${progress.text} · ${progress.count} ${progress.count === 1 ? "person" : "people"}`;
}

export function ViewPackDialog({
  pack,
  open,
  onOpenChange,
  progress,
  onAssign,
  isAdmin = true,
}: {
  pack: DocPackListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: PackAssignmentProgress | undefined;
  onAssign: () => void;
  isAdmin?: boolean;
}) {
  const assignment = assignmentSummary(progress);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 sm:max-w-sm" showCloseButton>
        <DialogHeader className="gap-2 sm:text-left">
          <div className="space-y-1.5">
            <DialogTitle className="text-base leading-tight text-balance">{pack.name}</DialogTitle>
            <DialogDescription className="sr-only">
              View details for {pack.name}.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-1">
              {pack.domainName && (
                <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[0.6875rem] font-normal">
                  <FolderIcon className="size-2.5" aria-hidden />
                  {pack.domainName}
                </Badge>
              )}
              <Badge
                variant={packStatusVariant(pack.status)}
                className="h-5 px-1.5 text-[0.6875rem]"
              >
                {STATUS_LABEL[pack.status]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {pack.description && (
          <p className="text-sm text-muted-foreground text-pretty">{pack.description}</p>
        )}

        <ul className="grid gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-2 text-sm">
          <DetailRow
            icon={<FolderIcon className="size-3.5" aria-hidden />}
            label="Domain"
            value={pack.domainName?.trim() || "Unassigned"}
          />
          {isAdmin && (
            <DetailRow
              icon={<UserPlusIcon className="size-3.5" aria-hidden />}
              label="Assigned"
              value={
                progress?.loading ? (
                  <Skeleton className="h-3 w-28" />
                ) : (
                  (assignment ?? "Not assigned yet")
                )
              }
            />
          )}
          <DetailRow
            icon={<CalendarIcon className="size-3.5" aria-hidden />}
            label="Created"
            value={formatCreatedAt(pack.createdAt)}
          />
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {isAdmin && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onAssign();
                }}
              >
                <UserPlusIcon className="size-3.5" aria-hidden />
                Assign
              </Button>
              <Button type="button" asChild>
                <Link href={`/doc-packs/${pack.id}`} onClick={() => onOpenChange(false)}>
                  <PencilIcon className="size-3.5" aria-hidden />
                  Edit
                </Link>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <li className="flex items-baseline gap-2 py-0.5">
      <span className="mt-0.5 shrink-0 self-start text-muted-foreground">{icon}</span>
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 truncate text-sm text-foreground leading-snug">{value}</div>
    </li>
  );
}
