"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAppRole } from "@/hooks/queries/me";
import { appPath } from "@/lib";
import { Button, Skeleton } from "@/ui";

/** Onboarding quizzes are for new employees — admins manage them from Projects / Tracks. */
export function MemberOnlyGate({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading } = useAppRole();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border px-5 py-8 text-center">
        <p className="font-medium">For new employees</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Onboarding quizzes are assigned to members. Admins create and track them from Projects.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href={appPath("projects")}>Go to Projects</Link>
        </Button>
      </div>
    );
  }

  return children;
}
