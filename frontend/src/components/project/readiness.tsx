import { CheckCircle2Icon, LoaderIcon, LockIcon } from "lucide-react";
import type { ProjectReadiness } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Progress } from "@/ui/progress";

/** One label for a member's standing on a project. */
export function readinessLabel(r: ProjectReadiness): "ready" | "in-progress" | "locked" | "open" {
  if (r.totalTracks === 0) return "open";
  if (!r.locked) return "ready";
  return r.passedTracks > 0 ? "in-progress" : "locked";
}

export function ReadinessBadge({ readiness }: { readiness: ProjectReadiness }) {
  const label = readinessLabel(readiness);
  if (label === "ready") {
    return (
      <Badge variant="success">
        <CheckCircle2Icon className="size-3" /> Ready
      </Badge>
    );
  }
  if (label === "open") {
    return <Badge variant="outline">Open</Badge>;
  }
  if (label === "in-progress") {
    return (
      <Badge variant="warning">
        <LoaderIcon className="size-3" /> In progress
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <LockIcon className="size-3" /> Locked
    </Badge>
  );
}

export function ReadinessBar({ readiness }: { readiness: ProjectReadiness }) {
  const { passedTracks, totalTracks, progressPct } = readiness;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalTracks === 0
            ? "No onboarding modules yet"
            : `${passedTracks} of ${totalTracks} modules passed`}
        </span>
        <span>{progressPct}%</span>
      </div>
      <Progress value={progressPct} />
    </div>
  );
}
