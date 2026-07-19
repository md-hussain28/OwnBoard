"use client";

import { CheckIcon, CircleAlertIcon, Link2Icon, StarIcon } from "lucide-react";
import { useState } from "react";
import { repoSlug } from "@/components/repo";
import { useAddProjectRepo } from "@/hooks/queries/project";
import { cn, notify } from "@/lib";
import type { ProjectDetail } from "@/schemas";
import {
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
} from "@/ui";

/** Inline feedback under the URL field: warn on junk, confirm a detected slug, or hint. */
function UrlHint({ showWarning, slug }: { showWarning: boolean; slug: string | null }) {
  if (showWarning) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-brand-coral">
        <CircleAlertIcon className="size-3.5 shrink-0" />
        That doesn't look like a repository URL yet.
      </p>
    );
  }
  if (slug) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-brand-teal">
        <CheckIcon className="size-3.5 shrink-0" />
        Detected <span className="font-medium">{slug}</span>
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      Paste an HTTPS or SSH URL from GitHub, GitLab, or Bitbucket.
    </p>
  );
}

/** Everything derived from the raw URL input: slug detection, validity, suggested name. */
function deriveUrlState(url: string) {
  const trimmedUrl = url.trim();
  const slug = repoSlug(trimmedUrl);
  // A usable git URL: recognisable host + an org/repo slug. We stay lenient (self-hosted
  // GitLab/Bitbucket are fine) but flag input that clearly isn't a repo URL yet.
  const looksLikeUrl =
    /^(https?:\/\/|git@)/i.test(trimmedUrl) || /[^/\s]+\/[^/\s]+/.test(trimmedUrl);
  const showUrlWarning = trimmedUrl.length > 0 && !looksLikeUrl;
  // The repo half of "org/repo" makes a good default name when the linker leaves it blank.
  const suggestedName = slug?.split("/").pop() ?? "";
  return { trimmedUrl, slug, looksLikeUrl, showUrlWarning, suggestedName };
}

/* Primary repo — a real backend field (is_primary). The first linked repo is always primary;
   after that the linker opts in. */
function PrimaryRepoToggle({
  checked,
  locked,
  onToggle,
}: {
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={locked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50",
        locked && "cursor-default opacity-90",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {checked && <CheckIcon className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <StarIcon className="size-3.5 text-brand-honey" />
          Set as primary repo
        </span>
        <span className="block text-xs text-muted-foreground">
          {locked
            ? "Your first repo is the project's primary automatically."
            : "The default repo for this project's codebase quizzes and Ask answers."}
        </span>
      </span>
    </button>
  );
}

/**
 * Link a repo by pasting its URL. (Choosing from an existing org-connected repo used to live here
 * too, but it added a second, rarely-used path — linking by URL de-dupes on the backend anyway.)
 */
export function LinkRepoDialog({ project }: { project: ProjectDetail }) {
  const addRepo = useAddProjectRepo(project.id);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const firstRepo = project.repos.length === 0;
  // First repo is the project's primary by definition; after that it's the linker's call.
  const [isPrimary, setIsPrimary] = useState(false);

  const { trimmedUrl, slug, looksLikeUrl, showUrlWarning, suggestedName } = deriveUrlState(url);

  function reset() {
    setUrl("");
    setName("");
    setIsPrimary(false);
  }

  function handleOpen(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  const canSubmit = trimmedUrl.length > 0 && looksLikeUrl;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    addRepo.mutate(
      {
        url: trimmedUrl,
        name: name.trim() || suggestedName || null,
        isPrimary: firstRepo || isPrimary,
      },
      {
        onSuccess: () => {
          handleOpen(false);
          notify.success("Repo linked");
        },
        onError: (err) => notify.apiError(err, "Could not link repo"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <Link2Icon className="size-4" /> Link repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Link a repository</DialogTitle>
            <DialogDescription>
              Point this project at a repo it ships. OwnBoard reads its commit history to build
              skills and ground Ask answers — it never needs access to your source code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-url">
                Repo URL
              </label>
              <Input
                id="repo-url"
                placeholder="https://github.com/org/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={showUrlWarning}
                autoFocus
              />
              <UrlHint showWarning={showUrlWarning} slug={slug} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-name">
                Display name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="repo-name"
                placeholder={suggestedName || "repo"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {suggestedName
                  ? `Leave blank to use “${suggestedName}”.`
                  : "How this repo shows up across the project."}
              </p>
            </div>

            <PrimaryRepoToggle
              checked={firstRepo || isPrimary}
              locked={firstRepo}
              onToggle={() => setIsPrimary((v) => !v)}
            />

            <p className="text-xs text-muted-foreground">You'll set up sync after linking.</p>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || addRepo.isPending}>
              {addRepo.isPending && <Spinner />} Link repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
