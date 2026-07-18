"use client";

import {
  ArrowRightIcon,
  CalendarClockIcon,
  ClockIcon,
  FileStackIcon,
  ListChecksIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmptyState, FilteredEmpty, FilterSelect, QueryState } from "@/components/shared";
import { useCreateProjectTrack, useProjectTracks } from "@/hooks/queries/project";
import { appPath, notify } from "@/lib";
import type { ProjectTrack } from "@/schemas";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Spinner,
  Textarea,
} from "@/ui";
import { ModuleAssignDialog } from "./module-assign-dialog";
import { ProjectSectionHeader } from "./project-section-header";

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

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "needs_review", label: "Needs review" },
];

function CreateTrackDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [dueInDays, setDueInDays] = useState("");
  const create = useCreateProjectTrack(projectId);
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        estimatedMinutes: parseOptionalInt(estimatedMinutes),
        dueOffsetDays: parseOptionalInt(dueInDays),
      },
      {
        onSuccess: (track) => {
          setOpen(false);
          setName("");
          setDescription("");
          setEstimatedMinutes("");
          setDueInDays("");
          notify.success("Module created", {
            description: "Upload source docs and build its quiz next.",
          });
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
            <DialogTitle>New module</DialogTitle>
            <DialogDescription>
              Create the module, then upload its source documents and build the grounded quiz. You
              choose who it&apos;s assigned to afterwards.
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
            <div className="grid grid-cols-2 gap-3">
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
              Due-in-days sets each member&apos;s deadline from when they&apos;re assigned. Both
              optional.
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

function ModuleRow({ projectId, track }: { projectId: string; track: ProjectTrack }) {
  const router = useRouter();
  const isManual = track.assignScope === "manual";
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60">
      <button
        type="button"
        onClick={() => router.push(appPath("tracks", track.id))}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate font-medium">{track.name}</p>
        {track.description && (
          <p className="truncate text-sm text-muted-foreground">{track.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {isManual ? `${track.assignedCount} assigned` : `Everyone (${track.assignedCount})`}
          </span>
          {track.estimatedMinutes != null && (
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-3.5" /> {track.estimatedMinutes} min
            </span>
          )}
          {track.dueOffsetDays != null && (
            <span className="inline-flex items-center gap-1">
              <CalendarClockIcon className="size-3.5" /> due in {track.dueOffsetDays} day
              {track.dueOffsetDays === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={statusVariant(track.status)}>
          {track.status === "active" ? "Published" : track.status.replace("_", " ")}
        </Badge>
        <ModuleAssignDialog projectId={projectId} track={track} />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Author module"
          onClick={() => router.push(appPath("tracks", track.id))}
        >
          <ArrowRightIcon className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </li>
  );
}

export function ProjectTracksTab({ projectId }: { projectId: string }) {
  const { data: tracks, isLoading, isError, error } = useProjectTracks(projectId);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const hasFilters = query.trim() !== "" || statusFilter !== "all";

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tracks ?? []).filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (q && !`${t.name} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tracks, query, statusFilter]);

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        icon={ListChecksIcon}
        title="Modules"
        description="Learning units with a grounded quiz. Assign each one to everyone on the project or to specific people — completion is tracked, but nothing blocks project access."
        action={<CreateTrackDialog projectId={projectId} />}
      />

      {(tracks ?? []).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search modules"
              placeholder="Search modules..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <FilterSelect
            aria-label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!!tracks && tracks.length === 0}
        empty={
          <EmptyState
            icon={FileStackIcon}
            tone="honey"
            title="No modules yet"
            description="Add a module so members have grounded material and a quiz to work through."
            action={<CreateTrackDialog projectId={projectId} />}
          />
        }
      >
        {filtered.length === 0 ? (
          <FilteredEmpty noun="modules" onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {filtered.map((track) => (
              <ModuleRow key={track.id} projectId={projectId} track={track} />
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
