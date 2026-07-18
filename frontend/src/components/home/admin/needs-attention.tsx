import type { LucideIcon } from "lucide-react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockAlertIcon,
  ShieldAlertIcon,
  UserRoundXIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/home/home-primitives";
import { appPath } from "@/lib/routes";
import type { SubsystemRisk } from "@/lib/skill-graph";
import { cn } from "@/lib/utils";
import type { CohortDashboard } from "@/schemas/cohort.schema";
import type { AssignmentOutcome } from "@/schemas/packAssignment.schema";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

export type AttentionItem = {
  id: string;
  tone: "danger" | "warning";
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
};

const MAX_ATTENTION = 5;

export function buildAttention(
  cohort: CohortDashboard | undefined,
  outcomes: AssignmentOutcome[],
  topRisk: SubsystemRisk | undefined,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const flaggedEmployees = new Set<string>();

  // 1. Recent quiz failures — most actionable.
  const failed = [...outcomes]
    .filter((o) => o.status === "failed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  for (const o of failed.slice(0, 3)) {
    flaggedEmployees.add(o.employeeId);
    items.push({
      id: `fail-${o.id}`,
      tone: "danger",
      icon: XCircleIcon,
      title: `${o.employeeName} didn't pass ${o.docPackName}`,
      subtitle: "Review the module or reach out",
      href: appPath("tracks", o.docPackId),
    });
  }

  // 2. People who've started but passed nothing — likely stuck.
  if (cohort) {
    const stuck = cohort.employees.filter(
      (e) => e.totalCount > 0 && e.passedCount === 0 && !flaggedEmployees.has(e.employeeId),
    );
    for (const e of stuck.slice(0, 2)) {
      items.push({
        id: `stuck-${e.employeeId}`,
        tone: "warning",
        icon: UserRoundXIcon,
        title: `${e.employeeName} hasn't passed any module yet`,
        subtitle: `0 of ${e.totalCount} done — they may be stuck`,
        href: appPath("tracks"),
      });
    }
  }

  // 3. Overdue work — one summary line.
  if (cohort && cohort.overdueAssignments > 0) {
    items.push({
      id: "overdue",
      tone: "warning",
      icon: ClockAlertIcon,
      title: `${cohort.overdueAssignments} assignment${cohort.overdueAssignments === 1 ? "" : "s"} overdue`,
      subtitle: "Past their due date and not yet passed",
      href: appPath("tracks"),
    });
  }

  // 4. A single bus-factor risk — where knowledge is dangerously concentrated.
  if (topRisk) {
    items.push({
      id: "risk",
      tone: "danger",
      icon: ShieldAlertIcon,
      title: `Only ${topRisk.topContributorName} understands ${topRisk.subsystem}`,
      subtitle: "One person holds this area — a bus-factor risk",
      href: appPath("dashboard"),
    });
  }

  return items.slice(0, MAX_ATTENTION);
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.icon;
  const wellClass =
    item.tone === "danger"
      ? "bg-brand-coral-soft text-brand-coral"
      : "bg-brand-honey-soft text-brand-amber";
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-[box-shadow,border-color] duration-200 hover:border-primary/20 hover:shadow-soft"
      >
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", wellClass)}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          {item.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function AttentionBody({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card className="border-brand-moss/25 bg-brand-moss-soft/25">
        <CardContent className="flex items-center gap-3 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-moss-soft text-brand-moss">
            <CheckCircle2Icon className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Nothing needs you right now. Everyone&apos;s moving and knowledge is well spread.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <AttentionRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

export function NeedsAttention({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Needs your attention" hint="Only the things worth acting on today" />
      <AttentionBody items={items} loading={loading} />
    </section>
  );
}
