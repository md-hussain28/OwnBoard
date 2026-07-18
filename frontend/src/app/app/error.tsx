"use client";

import { LayoutDashboardIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { StatusScreen } from "@/components/shared";
import { APP_HOME } from "@/lib";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/ui";

/**
 * Console error boundary — catches errors within `/app` while keeping the shell (sidebar/topbar)
 * mounted, so the user can retry or navigate away without a full reload. Uses the shared
 * `getApiErrorMessage` so a failed request shows the backend's friendly text, not a stack trace.
 */
export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Console error:", error);
  }, [error]);

  return (
    <StatusScreen
      contained
      tone="danger"
      icon={<TriangleAlertIcon aria-hidden />}
      title="This section couldn’t load"
      description={getApiErrorMessage(
        error,
        "An unexpected error stopped this page from loading. Try again, or return to your dashboard.",
      )}
      actions={
        <>
          <Button size="lg" className="w-full sm:w-auto" onClick={() => reset()}>
            <RotateCwIcon aria-hidden />
            Try again
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link href={APP_HOME}>
              <LayoutDashboardIcon aria-hidden />
              Go to dashboard
            </Link>
          </Button>
        </>
      }
      footer={
        error.digest ? (
          <p className="text-center text-xs text-muted-foreground">
            Reference code: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null
      }
    />
  );
}
