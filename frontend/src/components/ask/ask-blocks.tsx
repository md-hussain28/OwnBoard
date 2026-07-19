"use client";

import {
  ChevronRightIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  HelpCircleIcon,
  TerminalIcon,
  UserRoundIcon,
} from "lucide-react";
import { cn, notify } from "@/lib";
import type {
  AskCodeSnippet,
  AskCommands,
  AskFaq,
  AskFileTree,
  AskKeyValue,
  AskPeople,
} from "@/schemas";
import { Badge, Button } from "@/ui";
import { SectionCard } from "./ask-visuals";

async function copyText(text: string, label = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(label);
  } catch {
    notify.error("Couldn't copy — select and copy manually");
  }
}

// ── Code snippet ───────────────────────────────────────────────────────────────
export function AskCodeSnippetBlock({ data }: { data: AskCodeSnippet }) {
  return (
    <SectionCard title={data.title} className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <FileIcon className="size-3.5 shrink-0 text-brand-teal" />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {data.filePath ?? data.language ?? "snippet"}
          </span>
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Copy code"
          onClick={() => copyText(data.code, "Code copied")}
        >
          <ClipboardCopyIcon />
        </Button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-xs leading-relaxed">
        <code className="font-mono text-foreground">{data.code}</code>
      </pre>
      {data.caption && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {data.caption}
        </p>
      )}
    </SectionCard>
  );
}

// ── File tree ──────────────────────────────────────────────────────────────────
type TreeNode = {
  name: string;
  isFile: boolean;
  note?: string;
  children: Map<string, TreeNode>;
};

function buildTree(paths: AskFileTree["paths"]): TreeNode {
  const root: TreeNode = { name: "", isFile: false, children: new Map() };
  for (const { path, note } of paths) {
    const isFile = !path.endsWith("/");
    const segments = path.split("/").filter(Boolean);
    let node = root;
    segments.forEach((seg, i) => {
      const last = i === segments.length - 1;
      let child = node.children.get(seg);
      if (!child) {
        child = { name: seg, isFile: last && isFile, children: new Map() };
        node.children.set(seg, child);
      }
      if (last) {
        child.isFile = isFile;
        if (note) child.note = note;
      }
      node = child;
    });
  }
  return root;
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  const children = [...node.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1; // folders first
    return a.name.localeCompare(b.name);
  });
  return (
    <ul className={cn(depth > 0 && "ml-3 border-l border-border/70 pl-2")}>
      {children.map((child) =>
        child.isFile ? (
          <li key={child.name} className="flex items-center gap-1.5 py-0.5">
            <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-xs text-foreground">{child.name}</span>
            {child.note && (
              <span className="truncate text-xs text-muted-foreground">— {child.note}</span>
            )}
          </li>
        ) : (
          <li key={child.name} className="py-0.5">
            <details open={depth < 1} className="group/tree">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded px-0.5 hover:text-brand-teal">
                <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/tree:rotate-90" />
                <FolderIcon className="size-3.5 shrink-0 text-brand-honey" />
                <span className="font-mono text-xs font-medium text-foreground">{child.name}/</span>
                {child.note && (
                  <span className="truncate text-xs text-muted-foreground">— {child.note}</span>
                )}
              </summary>
              <TreeBranch node={child} depth={depth + 1} />
            </details>
          </li>
        ),
      )}
    </ul>
  );
}

export function AskFileTreeBlock({ data }: { data: AskFileTree }) {
  const tree = buildTree(data.paths);
  return (
    <SectionCard title={data.title}>
      {data.root && (
        <div className="mb-1 flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
          <FolderIcon className="size-3.5 text-brand-honey" />
          {data.root}/
        </div>
      )}
      <TreeBranch node={tree} depth={0} />
    </SectionCard>
  );
}

// ── Commands ───────────────────────────────────────────────────────────────────
export function AskCommandsBlock({ data }: { data: AskCommands }) {
  const allCommands = data.commands.map((c) => c.command).join("\n");
  return (
    <SectionCard title={data.title}>
      {data.intro && <p className="-mt-1 mb-3 text-sm text-muted-foreground">{data.intro}</p>}
      <div className="space-y-2">
        {data.commands.map((c, i) => (
          <div key={`${i}-${c.command}`} className="group/cmd">
            {c.description && <p className="mb-1 text-xs text-muted-foreground">{c.description}</p>}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-brand-ink/95 px-3 py-2">
              <TerminalIcon className="size-3.5 shrink-0 text-brand-honey" />
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-brand-mist">
                {c.command}
              </code>
              <button
                type="button"
                aria-label="Copy command"
                onClick={() => copyText(c.command, "Command copied")}
                className="shrink-0 text-brand-mist/60 transition-colors hover:text-brand-mist"
              >
                <ClipboardCopyIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {data.commands.length > 1 && (
        <Button
          size="xs"
          variant="outline"
          className="mt-3"
          onClick={() => copyText(allCommands, "All commands copied")}
        >
          <ClipboardCopyIcon />
          Copy all
        </Button>
      )}
    </SectionCard>
  );
}

// ── People / contributors ──────────────────────────────────────────────────────
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function AskPeopleBlock({ data }: { data: AskPeople }) {
  return (
    <SectionCard title={data.title ?? "Who works on this"}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.people.map((p, i) => (
          <div
            key={`${i}-${p.name}`}
            className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-teal-soft font-heading text-xs font-semibold text-brand-teal">
              {initialsOf(p.name) || <UserRoundIcon className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-foreground">{p.name}</span>
                {p.role && <span className="shrink-0 text-xs text-muted-foreground">{p.role}</span>}
              </div>
              {p.focus && <p className="text-xs text-muted-foreground">{p.focus}</p>}
              {p.stat && (
                <Badge variant="secondary" className="mt-1">
                  {p.stat}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── FAQ accordion ──────────────────────────────────────────────────────────────
export function AskFaqBlock({ data }: { data: AskFaq }) {
  return (
    <SectionCard title={data.title ?? "Common questions"}>
      <div className="space-y-1.5">
        {data.items.map((item, i) => (
          <details
            key={`${i}-${item.question}`}
            className="group/faq rounded-lg border border-border"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium text-foreground hover:text-brand-teal">
              <HelpCircleIcon className="size-4 shrink-0 text-brand-teal" />
              <span className="min-w-0 flex-1">{item.question}</span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open/faq:rotate-90" />
            </summary>
            <p className="border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Key/value fact sheet ───────────────────────────────────────────────────────
export function AskKeyValueBlock({ data }: { data: AskKeyValue }) {
  return (
    <SectionCard title={data.title ?? "At a glance"}>
      <dl className="divide-y divide-border/60">
        {data.items.map((item, i) => (
          <div
            key={`${i}-${item.label}`}
            className="flex items-baseline gap-3 py-1.5 first:pt-0 last:pb-0"
          >
            <dt className="w-32 shrink-0 text-xs font-medium text-muted-foreground">
              {item.label}
            </dt>
            <dd className="min-w-0 flex-1 text-sm text-foreground">
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-teal hover:underline"
                >
                  {item.value}
                  <ExternalLinkIcon className="size-3" />
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}
