import { CheckCircle2Icon, CircleDashedIcon, LoaderIcon } from "lucide-react";
import type { ProjectReadiness } from "@/schemas";
import { Badge, Progress } from "@/ui";

/**
 * A member's module-completion standing on a project. Progress only — access is never gated:
 * "ready" = all done, "in-progress" = some done, "locked" = assigned but none done yet ("Not started"),
 * "open" = no modules assigned.
 */
export function readinessLabel(r: ProjectReadiness): "ready" | "in-progress" | "locked" | "open" {
  if (r.totalTracks === 0) return "open";
  if (r.passedTracks >= r.totalTracks) return "ready";
  return r.passedTracks > 0 ? "in-progress" : "locked";
}

export function ReadinessBadge({ readiness }: { readiness: ProjectReadiness }) {
  const label = readinessLabel(readiness);
  if (label === "ready") {
    return (
      <Badge variant="success">
        <CheckCircle2Icon className="size-3" /> Done
      </Badge>
    );
  }
  if (label === "open") {
    return <Badge variant="outline">No modules</Badge>;
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
      <CircleDashedIcon className="size-3" /> Not started
    </Badge>
  );
}

export function ReadinessBar({ readiness }: { readiness: ProjectReadiness }) {
  const { passedTracks, totalTracks, progressPct } = readiness;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalTracks === 0 ? "No modules yet" : `${passedTracks} of ${totalTracks} modules done`}
        </span>
        <span>{progressPct}%</span>
      </div>
      <Progress value={progressPct} />
    </div>
  );
}
