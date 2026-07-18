"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand";
import { APP_HOME } from "@/lib";
import { Button } from "@/ui";

export function MarketingHeader() {
  const { isSignedIn, isLoaded } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const showAuthCtas = !isLoaded || !isSignedIn;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="transition-opacity hover:opacity-90">
          <BrandLogo markClassName="size-8 rounded-[0.55rem]" />
        </Link>
        <nav className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
          </Button>
          {showAuthCtas ? (
            <>
              <SignInButton mode="modal" forceRedirectUrl={APP_HOME}>
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl={APP_HOME}>
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={APP_HOME}>Open app</Link>
              </Button>
              <UserButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
