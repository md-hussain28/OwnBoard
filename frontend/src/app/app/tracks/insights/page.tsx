"use client";

import Link from "next/link";
import { CohortDashboard } from "@/components/doc-pack";
import { useAppRole } from "@/hooks/queries/me";
import { Button, Skeleton } from "@/ui";

export default function TracksInsightsPage() {
  const { isAdmin, isLoading } = useAppRole();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-border px-5 py-8 text-center">
        <p className="font-medium">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only organization admins can view onboarding insights.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/app/onboarding/packs">Go to assigned reading</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          Onboarding overview
        </h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Track how the cohort is progressing across every onboarding module — who&apos;s passed,
          who&apos;s overdue, and where people are stuck.
        </p>
      </header>
      <CohortDashboard />
    </div>
  );
}
