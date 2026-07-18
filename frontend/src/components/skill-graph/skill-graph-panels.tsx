"use client";

import { useMemo } from "react";
import { QueryState } from "@/components/shared/query-state";
import { useExpertiseScores } from "@/hooks/queries/skill-graph/skill-graph.queries";
import { contributorRanks, type RiskLevel, riskiestFiles, subsystemRisks } from "@/lib/skill-graph";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-danger/10 text-danger",
};

// Contributor accent series — honey → teal → moss → coral → plum (DESIGN.md chart order).
const SERIES = [
  "bg-brand-honey",
  "bg-brand-teal",
  "bg-brand-moss",
  "bg-brand-coral",
  "bg-brand-plum",
];

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function SubsystemBusFactor({ repoId }: { repoId: string }) {
  const { data, isLoading, isError, error } = useExpertiseScores(repoId);
  const rows = useMemo(() => subsystemRisks(data ?? []), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bus-factor by subsystem</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={rows.length === 0}
          empty={<p className="text-sm text-muted-foreground">No git history ingested yet.</p>}
        >
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.subsystem}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-4 py-3",
                  RISK_STYLES[row.riskLevel],
                )}
              >
                <span className="truncate font-medium">{row.subsystem}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm tabular-nums">
                    {pct(row.topShare)} · {row.topContributorName}
                  </span>
                  <Badge variant="outline">{row.riskLevel}</Badge>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}

export function TopContributors({ repoId }: { repoId: string }) {
  const { data, isLoading, isError, error } = useExpertiseScores(repoId);
  const ranks = useMemo(() => contributorRanks(data ?? []).slice(0, 8), [data]);
  const max = ranks[0]?.totalScore ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who built what</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={ranks.length === 0}
          empty={<p className="text-sm text-muted-foreground">No contributors yet.</p>}
        >
          <div className="space-y-3">
            {ranks.map((c, i) => (
              <div key={c.contributorId} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {c.commitCount} commits · {c.fileCount} files
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", SERIES[i % SERIES.length])}
                    style={{ width: `${Math.max(4, (c.totalScore / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}

export function RiskiestFiles({ repoId }: { repoId: string }) {
  const { data, isLoading, isError, error } = useExpertiseScores(repoId);
  const files = useMemo(() => riskiestFiles(data ?? [], 8), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Single points of failure</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={files.length === 0}
          empty={<p className="text-sm text-muted-foreground">No files ingested yet.</p>}
        >
          <div className="space-y-1.5">
            {files.map((f) => (
              <div
                key={f.filePath}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="truncate font-mono text-xs">{f.filePath}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pct(f.topShare)} · {f.topContributorName}
                  </span>
                  <Badge variant="outline" className={cn("border-0", RISK_STYLES[f.riskLevel])}>
                    {f.riskLevel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}
