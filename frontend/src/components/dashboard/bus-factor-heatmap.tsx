"use client";

import { useBusFactor } from "@/hooks/queries/dashboard/dashboard.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";
import { cn } from "@/lib/utils";

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function BusFactorHeatmap({ repoId }: { repoId: string }) {
  const { data, isLoading, isError } = useBusFactor(repoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bus-factor heatmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Bus-factor analytics aren&apos;t available yet.
          </p>
        )}
        {!isLoading && !isError && data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No subsystem data yet.</p>
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
