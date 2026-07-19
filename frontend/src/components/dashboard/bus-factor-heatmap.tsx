"use client";

import { GitBranchIcon } from "lucide-react";
import { IncomingFeature } from "@/components/layout";
import { EmptyState, LoadingPun } from "@/components/shared";
import { useBusFactor } from "@/hooks/queries/dashboard";
import { cn } from "@/lib";
import { isNotImplementedError } from "@/lib/api";
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/ui";

const RISK_STYLES: Record<string, string> = {
  low: "bg-success/10 text-success",
  medium: "bg-warning/10 text-warning",
  high: "bg-danger/10 text-danger",
};

export function BusFactorHeatmap({ repoId }: { repoId: string }) {
  const { data, isLoading, isError, error } = useBusFactor(repoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bus-factor heatmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <LoadingPun className="justify-start text-xs" />
          </div>
        )}
        {isError && isNotImplementedError(error) && (
          <IncomingFeature description="Bus-factor analysis is grounded in real git history — it's still being built." />
        )}
        {isError && !isNotImplementedError(error) && (
          <p className="text-sm text-muted-foreground">
            Bus-factor analytics aren&apos;t available right now.
          </p>
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <EmptyState
            icon={GitBranchIcon}
            tone="mist"
            compact
            bordered={false}
            title="No subsystem data yet"
          />
        )}
        {!isLoading &&
          !isError &&
          data?.map((entry) => (
            <div
              key={entry.subsystem}
              className={cn(
                "flex items-center justify-between rounded-md px-4 py-3",
                RISK_STYLES[entry.riskLevel],
              )}
            >
              <span className="font-medium">{entry.subsystem}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  {Math.round(entry.topContributorShare * 100)}% top contributor
                </span>
                <Badge variant="outline">{entry.riskLevel}</Badge>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
