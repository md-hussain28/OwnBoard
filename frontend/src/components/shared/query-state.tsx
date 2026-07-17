"use client";

import type { ReactNode } from "react";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Skeleton } from "@/ui/skeleton";

type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loading?: ReactNode;
  errorMessage?: string;
  empty?: ReactNode;
  children: ReactNode;
};

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty = false,
  loading,
  errorMessage,
  empty,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return (
      loading ?? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        {errorMessage ??
          `Could not load data (${getApiErrorMessage(error)}). Start the FastAPI service and refresh.`}
      </p>
    );
  }

  if (isEmpty) {
    return empty ?? <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }

  return children;
}
