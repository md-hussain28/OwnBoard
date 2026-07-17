"use client";

import { ArrowRightIcon, FileStackIcon } from "lucide-react";
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

function CreateTrackDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateProjectTrack(projectId);
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), description: description.trim() || null },
      {
        onSuccess: (track) => {
          setOpen(false);
          setName("");
          setDescription("");
          notify.success("Track created", {
            description: "Upload documents and build its quiz next.",
          });
          // Hand off to the existing track authoring surface (docs + quiz builder).
          router.push(appPath("tracks", track.id));
        },
        onError: (err) => notify.apiError(err, "Could not create track"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add track</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New project track</DialogTitle>
            <DialogDescription>
              Create the track, then you&apos;ll be taken to upload its documents and build the
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
          Onboarding tracks that gate entry to this project.
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
              No tracks yet. Add one so new members have something to pass.
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
