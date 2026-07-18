"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useCreateModule, useUpdateModule } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { ProjectFunctionType, ProjectModule, ResourceLink } from "@/schemas/project.schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Spinner } from "@/ui/spinner";
import { Textarea } from "@/ui/textarea";

export function ModuleFormDialog({
  projectId,
  functionTypes,
  module,
  trigger,
}: {
  projectId: string;
  functionTypes: ProjectFunctionType[];
  module?: ProjectModule;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const create = useCreateModule(projectId);
  const update = useUpdateModule(projectId);
  const isEdit = !!module;
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState(module?.name ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [content, setContent] = useState(module?.content ?? "");
  const [status, setStatus] = useState(module?.status ?? "draft");
  const [minutes, setMinutes] = useState(module?.estimatedMinutes?.toString() ?? "");
  const [typeIds, setTypeIds] = useState<Set<string>>(new Set(module?.functionTypeIds ?? []));
  const [links, setLinks] = useState<ResourceLink[]>(module?.resourceLinks ?? []);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  function reseed() {
    setName(module?.name ?? "");
    setDescription(module?.description ?? "");
    setContent(module?.content ?? "");
    setStatus(module?.status ?? "draft");
    setMinutes(module?.estimatedMinutes?.toString() ?? "");
    setTypeIds(new Set(module?.functionTypeIds ?? []));
    setLinks(module?.resourceLinks ?? []);
    setLinkLabel("");
    setLinkUrl("");
  }

  function handleOpenChange(next: boolean) {
    if (next) reseed();
    setOpen(next);
  }

  function toggleType(id: string) {
    setTypeIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function addLink() {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setLinks((prev) => [...prev, { label: linkLabel.trim(), url: linkUrl.trim() }]);
    setLinkLabel("");
    setLinkUrl("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const input = {
      name: name.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      resourceLinks: links,
      functionTypeIds: Array.from(typeIds),
      estimatedMinutes: minutes ? Number(minutes) : null,
      status,
    };
    const onDone = {
      onSuccess: () => {
        setOpen(false);
        notify.success(isEdit ? "Doc updated" : "Doc created", { description: name.trim() });
      },
      onError: (err: unknown) => notify.apiError(err, "Could not save doc"),
    };
    if (isEdit) update.mutate({ moduleId: module.id, input }, onDone);
    else create.mutate(input, onDone);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit doc" : "New doc"}</DialogTitle>
            <DialogDescription>
              A doc is dev-facing project context. It auto-assigns to members whose function matches
              the types below — leave types empty to reach everyone on the project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="module-name">
                Name
              </label>
              <Input
                id="module-name"
                placeholder="e.g. Frontend architecture tour"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="module-desc">
                Short description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="module-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="module-content">
                Content <span className="text-muted-foreground">(markdown, optional)</span>
              </label>
              <Textarea
                id="module-content"
                rows={5}
                placeholder="Explain how this part of the project works…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">Function types</span>
              {functionTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No function types yet — add some to target this doc by role.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {functionTypes.map((t) => {
                    const active = typeIds.has(t.id);
                    return (
                      <button key={t.id} type="button" onClick={() => toggleType(t.id)}>
                        <Badge
                          variant={active ? "default" : "outline"}
                          className={cn(active && "ring-1 ring-primary")}
                        >
                          {t.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                Resource links <span className="text-muted-foreground">(optional)</span>
              </span>
              {links.map((l, i) => (
                <div key={`${l.label}-${l.url}`} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{l.label}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove link"
                    onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                />
                <Input
                  placeholder="https://…"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={addLink}>
                  <PlusIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium" htmlFor="module-status">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="module-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active (auto-assigns)</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1.5">
                <label className="text-sm font-medium" htmlFor="module-minutes">
                  Est. min
                </label>
                <Input
                  id="module-minutes"
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Spinner />}
              {isEdit ? "Save changes" : "Create doc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
