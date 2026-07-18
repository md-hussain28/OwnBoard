"use client";

import Link from "next/link";
import { QuizBuilderFlow } from "@/components/doc-pack";
import { useAppRole } from "@/hooks/queries/me";
import { Button, Skeleton } from "@/ui";

export function DocPackDetailView({ id }: { id: string }) {
  const { isAdmin, isLoading } = useAppRole();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-border px-5 py-8 text-center">
        <p className="font-medium">Admins only</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Only organization admins can edit modules.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/app/onboarding/packs">Go to assigned reading</Link>
        </Button>
      </div>
    );
  }

  return <QuizBuilderFlow packId={id} />;
}
