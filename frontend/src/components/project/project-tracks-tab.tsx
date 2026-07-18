"use client";

import { ArrowRightIcon, CalendarClockIcon, ClockIcon, FileStackIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QueryState } from "@/components/shared/query-state";
import { useCreateProjectTrack } from "@/hooks/queries/project/project.mutations";
import { useProjectTracks } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { notify } from "@/lib/toast";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Spinner } from "@/ui/spinner";
import { Textarea } from "@/ui/textarea";

function statusVariant(status: string): "success" | "secondary" | "warning" {
  if (status === "active") return "success";
  if (status === "needs_review") return "warning";
  return "secondary";
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isNaN(n) ? null : n;
}

function CreateTrackDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [dueInDays, setDueInDays] = useState("");
  const create = useCreateProjectTrack(projectId);
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const sequenceOrder = parseOptionalInt(order);
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        ...(sequenceOrder != null ? { sequenceOrder } : {}),
        estimatedMinutes: parseOptionalInt(estimatedMinutes),
        dueOffsetDays: parseOptionalInt(dueInDays),
      },
      {
        onSuccess: (track) => {
          setOpen(false);
          setName("");
          setDescription("");
          setOrder("");
          setEstimatedMinutes("");
          setDueInDays("");
          notify.success("Module created", {
            description: "Upload documents and build its quiz next.",
          });
          // Hand off to the existing track authoring surface (docs + quiz builder).
          router.push(appPath("tracks", track.id));
        },
        onError: (err) => notify.apiError(err, "Could not create module"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add module</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project module</DialogTitle>
            <DialogDescription>
              Create the module, then you&apos;ll be taken to upload its documents and build the
              grounded quiz. Members must pass it to unlock this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="track-name">
                Name
              </label>
              <Input
                id="track-name"
                placeholder="e.g. Payments Codebase Walkthrough"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="track-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="track-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="track-order">
                  Order
                </label>
                <Input
                  id="track-order"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={order}
                  onChange={(e) => setOrder(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="track-minutes">
                  Est. minutes
                </label>
                <Input
                  id="track-minutes"
                  type="number"
                  min={1}
                  placeholder="—"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="track-due">
                  Due in (days)
                </label>
                <Input
                  id="track-due"
                  type="number"
                  min={0}
                  placeholder="—"
                  value={dueInDays}
                  onChange={(e) => setDueInDays(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Order controls the sequence members see. Due-in-days sets each member&apos;s deadline
              from when they&apos;re assigned. All optional.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              {create.isPending && <Spinner />}
              {create.isPending ? "Creating..." : "Create & author"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectTracksTab({ projectId }: { projectId: string }) {
  const { data: tracks, isLoading, isError, error } = useProjectTracks(projectId);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Onboarding steps that gate entry to this project. Members must complete every step.
        </p>
        <CreateTrackDialog projectId={projectId} />
      </div>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!tracks && tracks.length === 0}
        empty={
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <FileStackIcon className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No modules yet. Add one so new members have something to pass.
            </p>
          </div>
        }
      >
        <ul className="space-y-2">
          {tracks?.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => router.push(appPath("tracks", track.id))}
                className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition-shadow duration-200 hover:shadow-soft"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{track.name}</p>
                  {track.description && (
                    <p className="truncate text-sm text-muted-foreground">{track.description}</p>
                  )}
                  {(track.estimatedMinutes != null || track.dueOffsetDays != null) && (
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {track.estimatedMinutes != null && (
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3.5" /> {track.estimatedMinutes} min
                        </span>
                      )}
                      {track.dueOffsetDays != null && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClockIcon className="size-3.5" /> due in {track.dueOffsetDays}{" "}
                          day
                          {track.dueOffsetDays === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={statusVariant(track.status)}>
                    {track.status === "active" ? "Published" : track.status.replace("_", " ")}
                  </Badge>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
