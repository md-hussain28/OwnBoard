"use client";

import { CompassIcon } from "lucide-react";
import { useTourStore } from "@/stores/tour-store";
import { Button } from "@/ui/button";

/** Topbar entry point to (re)launch the guided product tour. */
export function TourTrigger() {
  const start = useTourStore((s) => s.start);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-tour="tour-trigger"
      onClick={start}
      className="gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <CompassIcon className="size-4" />
      <span className="hidden sm:inline">Take a tour</span>
    </Button>
  );
}
