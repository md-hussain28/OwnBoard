import { cn } from "@/lib/utils";
import type { CohortDashboard } from "@/schemas/cohort.schema";
import { peopleStillOnboarding } from "./status";

const STAT_TONE_TEXT: Record<"neutral" | "warning" | "danger" | "success", string> = {
  neutral: "text-foreground",
  warning: "text-brand-amber",
  danger: "text-brand-coral",
  success: "text-brand-moss",
};

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  const toneText = STAT_TONE_TEXT[tone];
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className={cn("text-xl font-semibold tabular-nums", toneText)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function SummaryTiles({
  cohort,
  highRiskCount,
}: {
  cohort: CohortDashboard;
  highRiskCount: number;
}) {
  const onboarding = peopleStillOnboarding(cohort);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="Onboarding complete"
        value={`${Math.round(cohort.completionPct)}%`}
        tone={cohort.completionPct >= 100 ? "success" : "neutral"}
      />
      <StatTile
        label={onboarding === 1 ? "Person onboarding" : "People onboarding"}
        value={String(onboarding)}
      />
      <StatTile
        label="Assignments overdue"
        value={String(cohort.overdueAssignments)}
        tone={cohort.overdueAssignments > 0 ? "warning" : "neutral"}
      />
      <StatTile
        label="Single-owner areas"
        value={String(highRiskCount)}
        tone={highRiskCount > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}
