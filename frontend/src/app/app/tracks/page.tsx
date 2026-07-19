"use client";

import { Suspense } from "react";
import { QuizDesk } from "@/components/doc-pack";
import { LoadingPun } from "@/components/shared";
import { Skeleton } from "@/ui";

function QuizDeskFallback() {
  return (
    <div className="flex min-h-[calc(100svh-7.5rem)] flex-col gap-4 lg:flex-row lg:rounded-2xl lg:border lg:border-border lg:p-0">
      <div className="w-full space-y-3 px-4 py-5 lg:w-[22rem] lg:border-r">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <div className="flex-1 space-y-3 px-6 py-5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <LoadingPun className="justify-start pt-2 text-xs" />
      </div>
    </div>
  );
}

export default function DocPacksPage() {
  return (
    <Suspense fallback={<QuizDeskFallback />}>
      <QuizDesk />
    </Suspense>
  );
}
