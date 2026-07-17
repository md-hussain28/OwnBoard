"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary — only fires when the root layout itself throws, so it must render its
 * own <html>/<body> and can't rely on providers, fonts, or shared components. Kept deliberately
 * minimal and self-contained so it works even when everything else is broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased">
        <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-center">
          <div className="flex max-w-md flex-col items-center">
            <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-7"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The application ran into an unexpected problem. Reloading usually fixes it.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground shadow-button transition-opacity hover:opacity-95"
              >
                Reload the app
              </button>
              <a
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-5 text-base font-semibold text-foreground shadow-soft transition-colors hover:bg-muted"
              >
                Back to home
              </a>
            </div>
            {error.digest ? (
              <p className="mt-6 text-xs text-muted-foreground">
                Reference code: <span className="font-mono">{error.digest}</span>
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
