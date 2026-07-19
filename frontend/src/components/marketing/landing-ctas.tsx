"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { APP_HOME, cn } from "@/lib";
import { Button } from "@/ui";

type LandingCtasProps = {
  /** Renders the secondary button for the fixed warm-ink band. */
  onInk?: boolean;
  className?: string;
};

/** Primary/secondary CTA pair — swaps to "Open app" once the visitor is signed in. */
export function LandingCtas({ onInk = false, className }: LandingCtasProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
        <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto" asChild>
          <Link href={APP_HOME}>
            Open app
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>
      <SignUpButton mode="modal" forceRedirectUrl={APP_HOME}>
        <Button size="lg" className="w-full active:scale-[0.96] sm:w-auto">
          Get started
          <ArrowRight className="size-4" />
        </Button>
      </SignUpButton>
      <SignInButton mode="modal" forceRedirectUrl={APP_HOME}>
        <Button
          size="lg"
          variant="outline"
          className={cn(
            "w-full active:scale-[0.96] sm:w-auto",
            onInk &&
              "border-white/15 bg-transparent text-white/90 hover:border-white/25 hover:bg-white/5 hover:text-white",
          )}
        >
          Sign in
        </Button>
      </SignInButton>
    </div>
  );
}
