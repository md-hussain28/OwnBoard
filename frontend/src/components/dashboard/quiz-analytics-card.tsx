"use client";

import { IncomingFeature } from "@/components/layout";
import { useQuizAnalytics } from "@/hooks/queries/dashboard";
import { isNotImplementedError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, Progress, Skeleton } from "@/ui";

export function QuizAnalyticsCard({ repoId }: { repoId: string }) {
  const { data, isLoading, isError, error } = useQuizAnalytics(repoId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && isNotImplementedError(error) && (
          <IncomingFeature description="Readiness scoring across new hires is still being built." />
        )}
        {isError && !isNotImplementedError(error) && (
          <p className="text-sm text-muted-foreground">
            Quiz analytics aren&apos;t available right now.
          </p>
        )}
        {!isLoading && !isError && data && (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Pass rate</span>
                <span>{Math.round(data.passRate * 100)}%</span>
              </div>
              <Progress value={data.passRate * 100} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Common failure points</p>
              {data.commonFailurePoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">None recorded.</p>
              ) : (
                <ul className="list-inside list-disc text-sm">
                  {data.commonFailurePoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
