"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState, type ReactNode } from "react";

export function AppClerkProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const appearance = useMemo(() => {
    const isDark = mounted && resolvedTheme === "dark";
    return {
      theme: isDark ? [shadcn, dark] : shadcn,
    };
  }, [mounted, resolvedTheme]);

  return <ClerkProvider appearance={appearance}>{children}</ClerkProvider>;
}
