"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConnectedReposList } from "@/components/repo/connected-repos-list";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { appPath } from "@/lib/routes";
import { Skeleton } from "@/ui/skeleton";

export default function AppHomePage() {
  const router = useRouter();
  const { isAdmin, isLoading } = useAppRole();

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) {
      router.replace(appPath("onboarding", "packs"));
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Connect repositories to ground quizzes, archaeology answers, and skill-graph risk in real
          git history.
        </p>
      </section>
      <ConnectedReposList />
    </div>
  );
}
