"use client";

import {
  AlarmClockIcon,
  CircleCheckBigIcon,
  GaugeIcon,
  HourglassIcon,
  TrophyIcon,
} from "lucide-react";
import { useMemo } from "react";
import {
  ASSIGNMENT_STATUS_LABEL,
  assignmentStatusVariant,
} from "@/components/shared/assignment-status";
import { useCohortDashboard } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { cn } from "@/lib/utils";
import type { CohortDashboard as CohortDashboardData } from "@/schemas/cohort.schema";
import { Badge } from "@/ui/badge";
import { Card, CardContent } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Skeleton } from "@/ui/skeleton";

function StatTile({
  icon: Icon,
  label,
  value,
  tone = "default",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "success" | "danger" | "warning" | "teal";
  children?: React.ReactNode;
}) {
  const toneClass = {
    default: "text-muted-foreground",
    success: "text-brand-moss",
    danger: "text-brand-coral",
    warning: "text-brand-amber",
    teal: "text-brand-teal",
  }[tone];

  return (
    <Card size="sm">
      <CardContent className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className={cn("size-3.5", toneClass)} />
          {label}
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatRow({ data }: { data: CohortDashboardData }) {
  const completion = Math.round(data.completionPct);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile icon={GaugeIcon} label="Completion" value={`${completion}%`} tone="teal">
        <Progress value={completion} className="mt-1" />
      </StatTile>
      <StatTile
        icon={CircleCheckBigIcon}
        label="Passed"
        value={`${data.passedAssignments}/${data.totalAssignments}`}
        tone="success"
      />
      <StatTile
        icon={AlarmClockIcon}
        label="Overdue"
        value={String(data.overdueAssignments)}
        tone="danger"
      />
      <StatTile
        icon={HourglassIcon}
        label="Not started"
        value={String(data.notStartedAssignments)}
        tone="warning"
      />
      <StatTile
        icon={GaugeIcon}
        label="Avg days to onboard"
        value={data.avgDaysToOnboard != null ? String(Math.round(data.avgDaysToOnboard)) : "—"}
      />
      <StatTile
        icon={TrophyIcon}
        label="Fully onboarded"
        value={String(data.fullyOnboardedCount)}
        tone="success"
      />
    </div>
  );
}

function CompletionMatrix({ data }: { data: CohortDashboardData }) {
  const tracks = useMemo(
    () => [...data.tracks].sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [data.tracks],
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 z-10 bg-background px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
              Employee
            </th>
            {tracks.map((track) => (
              <th
                key={track.id}
                className="min-w-32 px-3 py-3 text-left text-xs font-semibold text-muted-foreground"
              >
                {track.name}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
              Progress
            </th>
          </tr>
        </thead>
        <tbody>
          {data.employees.map((employee) => {
            const pct =
              employee.totalCount > 0
                ? Math.round((employee.passedCount / employee.totalCount) * 100)
                : 0;
            return (
              <tr
                key={employee.employeeId}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40"
              >
                <td className="sticky left-0 z-10 max-w-48 truncate bg-background px-4 py-2.5 font-medium">
                  {employee.employeeName}
                </td>
                {tracks.map((track) => {
                  const status = employee.cells[track.id];
                  return (
                    <td key={track.id} className="px-3 py-2.5">
                      {status ? (
                        <Badge variant={assignmentStatusVariant(status)}>
                          {ASSIGNMENT_STATUS_LABEL[status]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {employee.passedCount}/{employee.totalCount}
                    </span>
                    <Progress value={pct} className="w-16" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CohortDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/** Admin cohort view: onboarding completion stats + an employee × track status matrix. */
export function CohortDashboard() {
  const { data, isLoading, isError } = useCohortDashboard();

  if (isLoading) return <CohortDashboardSkeleton />;

  if (isError || !data) {
    return (
      <p className="rounded-xl border border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Couldn&apos;t load the onboarding overview. Try again shortly.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <StatRow data={data} />
      {data.employees.length === 0 ? (
        <p className="rounded-xl border border-border px-5 py-8 text-center text-sm text-muted-foreground">
          No employees have been assigned a track yet.
        </p>
      ) : (
        <CompletionMatrix data={data} />
      )}
    </div>
  );
}
