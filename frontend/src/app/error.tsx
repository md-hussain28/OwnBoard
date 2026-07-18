"use client";

import { HomeIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { AtmosphereBlobs } from "@/components/layout";
import { StatusScreen } from "@/components/shared";
import { Button } from "@/ui";

/**
 * Root error boundary — catches render/runtime errors anywhere below the root layout that
 * aren't caught by a deeper boundary. Gives the user a friendly message plus a retry and a
 * safe exit, rather than Next's default white error screen.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error to the console/monitoring; the UI stays user-friendly.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main className="relative">
      <AtmosphereBlobs />
      <StatusScreen
        tone="danger"
        icon={<TriangleAlertIcon aria-hidden />}
        title="Something went wrong"
        description="An unexpected error interrupted this page. You can try again, or head back home — your data is safe."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" onClick={() => reset()}>
              <RotateCwIcon aria-hidden />
              Try again
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="/">
                <HomeIcon aria-hidden />
                Back to home
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
    </main>
  );
}
