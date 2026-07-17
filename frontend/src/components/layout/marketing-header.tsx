"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/ui/button";

export function MarketingHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-[11px] font-bold text-white shadow-button">
            Ob
          </span>
          OwnBoard
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
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </nav>
      </div>
    </header>
  );
}
