"use client";

import { useState } from "react";
import { useCreateRepo } from "@/hooks/queries/repo";
import { notify } from "@/lib";
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

export function ConnectRepoDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const create = useCreateRepo();

  function reset() {
    setName("");
    setUrl("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !url.trim()) return;
    create.mutate(
      { name: name.trim(), url: url.trim() },
      {
        onSuccess: (repo) => {
          setOpen(false);
          reset();
          notify.success("Repository added", { description: repo.name });
        },
        onError: (err) => notify.apiError(err, "Could not add repository"),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Connect repository</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Connect a repository</DialogTitle>
            <DialogDescription>
              Register the repo, then add a small GitHub Action that pushes its git-history metadata
              to OwnBoard. OwnBoard never gets access to your code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-name">
                Display name
              </label>
              <Input
                id="repo-name"
                placeholder="e.g. Payments Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="repo-url">
                Repository URL
              </label>
              <Input
                id="repo-url"
                placeholder="https://github.com/your-org/your-repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending || !name.trim() || !url.trim()}>
              {create.isPending && <Spinner />}
              Add repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
