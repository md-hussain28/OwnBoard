"use client";

import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateProject } from "@/hooks/queries/project/project.mutations";
import { notify } from "@/lib/toast";
import type { GlossaryTerm, ProjectDetail, ResourceLink } from "@/schemas/project.schema";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

/** Manager-only editor for the project's reference context (tech stack, links, glossary). */
export function ProjectContextTab({ project }: { project: ProjectDetail }) {
  return (
    <div className="space-y-4">
      <TechStackCard project={project} />
      <ResourceLinksCard project={project} />
      <GlossaryCard project={project} />
    </div>
  );
}

function TechStackCard({ project }: { project: ProjectDetail }) {
  const update = useUpdateProject(project.id);
  const [value, setValue] = useState("");

  function save(next: string[]) {
    update.mutate(
      { techStack: next },
      { onError: (err) => notify.apiError(err, "Could not save tech stack") },
    );
  }

  function add() {
    const parts = value
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...project.techStack, ...parts]));
    setValue("");
    save(next);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Tech stack</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {project.techStack.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing added yet.</p>
          )}
          {project.techStack.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => save(project.techStack.filter((x) => x !== t))}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Next.js, FastAPI, Postgres"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button variant="outline" onClick={add}>
            <PlusIcon className="size-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceLinksCard({ project }: { project: ProjectDetail }) {
  const update = useUpdateProject(project.id);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  function save(next: ResourceLink[]) {
    update.mutate(
      { resourceLinks: next },
      { onError: (err) => notify.apiError(err, "Could not save links") },
    );
  }

  function add() {
    if (!label.trim() || !url.trim()) return;
    save([...project.resourceLinks, { label: label.trim(), url: url.trim() }]);
    setLabel("");
    setUrl("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Resource links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.resourceLinks.length > 0 && (
          <ul className="divide-y divide-border">
            {project.resourceLinks.map((l, i) => (
              <li key={`${l.label}-${l.url}`} className="flex items-center gap-2 py-2 text-sm">
                <span className="font-medium">{l.label}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.url}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove link"
                  onClick={() => save(project.resourceLinks.filter((_, idx) => idx !== i))}
                >
                  <XIcon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-32 flex-1 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Label</label>
            <Input placeholder="Runbook" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="min-w-48 flex-[2] space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">URL</label>
            <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <Button variant="outline" onClick={add} disabled={!label.trim() || !url.trim()}>
            <PlusIcon className="size-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GlossaryCard({ project }: { project: ProjectDetail }) {
  const update = useUpdateProject(project.id);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  function save(next: GlossaryTerm[]) {
    update.mutate(
      { glossary: next },
      { onError: (err) => notify.apiError(err, "Could not save glossary") },
    );
  }

  function add() {
    if (!term.trim() || !definition.trim()) return;
    save([...project.glossary, { term: term.trim(), definition: definition.trim() }]);
    setTerm("");
    setDefinition("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Glossary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.glossary.length > 0 && (
          <ul className="space-y-2">
            {project.glossary.map((g, i) => (
              <li key={g.term} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.term}</p>
                  <p className="text-sm text-muted-foreground">{g.definition}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove term"
                  onClick={() => save(project.glossary.filter((_, idx) => idx !== i))}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-2">
          <Input placeholder="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
          <Textarea
            placeholder="Definition"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
          />
          <Button variant="outline" onClick={add} disabled={!term.trim() || !definition.trim()}>
            <PlusIcon className="size-4" /> Add term
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
