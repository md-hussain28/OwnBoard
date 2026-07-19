"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  KeyRoundIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useState } from "react";
import { CodeSnippet } from "@/components/shared";
import { useCreateIngestKey, useIngestKeys, useRevokeIngestKey } from "@/hooks/queries/ingest-key";
import { useExpertiseScores } from "@/hooks/queries/skill-graph";
import { notify } from "@/lib";
import type { Repo } from "@/schemas";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Separator, Spinner } from "@/ui";

// The customer's GitHub Action posts directly to the backend (not through the Next proxy), so this
// must be the public API URL. Set NEXT_PUBLIC_OWNBOARD_INGEST_URL in the frontend env for deploys.
const INGEST_URL =
  process.env.NEXT_PUBLIC_OWNBOARD_INGEST_URL ?? "http://localhost:8000/api/v1/ingest";
// Where the composite action lives — update to wherever this repo is hosted.
const ACTION_REF = "md-hussain28/OwnBoard/.github/actions/ownboard-extract@main";
// The workflow the connect steps ask the admin to commit (.github/workflows/<file>).
const WORKFLOW_FILE = "ownboard.yml";

// A GitHub-hosted runner can't reach the developer's localhost, so a workflow that points there
// silently fails at the POST. Flag it in the UI before the admin copies a broken snippet.
const ingestUrlIsLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(INGEST_URL);

/**
 * Deep-link to the repo's Actions → OwnBoard sync → Run workflow page. Ingestion is push-model
 * (OwnBoard has no repo access), so a manual sync is the workflow's own `workflow_dispatch`.
 * Returns null when `url` isn't a recognizable GitHub repo.
 */
function githubWorkflowRunUrl(url: string): string | null {
  const match = url.match(/github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i);
  if (!match) return null;
  const [, owner, repo] = match;
  return `https://github.com/${owner}/${repo}/actions/workflows/${WORKFLOW_FILE}`;
}

function workflowYaml(): string {
  return [
    "name: OwnBoard sync",
    "on:",
    "  workflow_dispatch: {}",
    "  schedule:",
    '    - cron: "0 3 * * *"',
    "jobs:",
    "  sync:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v4",
    "        with:",
    "          fetch-depth: 0",
    `      - uses: ${ACTION_REF}`,
    "        with:",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression syntax in a YAML snippet, not a JS template literal
    "          api_key: ${{ secrets.OWNBOARD_KEY }}",
    `          endpoint: ${INGEST_URL}`,
  ].join("\n");
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-honey-soft text-xs font-semibold text-brand-honey">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function RepoConnectPanel({ repo }: { repo: Repo }) {
  const { data: keys } = useIngestKeys(repo.id);
  const { data: scores } = useExpertiseScores(repo.id);
  const createKey = useCreateIngestKey(repo.id);
  const revokeKey = useRevokeIngestKey(repo.id);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const activeKeys = (keys ?? []).filter((k) => !k.revokedAt);
  const contributorCount = new Set((scores ?? []).map((s) => s.contributorId)).size;
  const fileCount = new Set((scores ?? []).map((s) => s.filePath)).size;
  const runUrl = githubWorkflowRunUrl(repo.url);

  function generate() {
    createKey.mutate(undefined, {
      onSuccess: (key) => {
        setFreshToken(key.token ?? null);
        notify.success("Ingest key created", {
          description: "Copy it now — it won't be shown again.",
        });
      },
      onError: (err) => notify.apiError(err, "Could not create ingest key"),
    });
  }

  function revoke(keyId: string) {
    revokeKey.mutate(keyId, {
      onSuccess: () => notify.success("Key revoked"),
      onError: (err) => notify.apiError(err, "Could not revoke key"),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect this repository</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ingestion status + manual sync */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {repo.ingestedAt ? (
              <>
                <Badge className="gap-1 bg-brand-moss-soft text-brand-moss">
                  <CheckCircle2Icon className="size-3.5" /> Synced
                </Badge>
                <span className="text-muted-foreground">
                  Last sync {new Date(repo.ingestedAt).toLocaleString()} · {contributorCount}{" "}
                  contributors · {fileCount} files
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Not synced yet — finish the steps below, then run the workflow.
              </span>
            )}
          </div>

          {runUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={runUrl} target="_blank" rel="noreferrer">
                <RefreshCwIcon />
                Sync now
                <ExternalLinkIcon className="text-muted-foreground" />
              </a>
            </Button>
          )}
        </div>

        {ingestUrlIsLocal && (
          <div className="flex gap-2 rounded-lg border border-brand-honey/40 bg-brand-honey-soft/50 px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-brand-honey" />
            <p>
              The workflow below posts to <code className="font-mono">{INGEST_URL}</code>. A GitHub
              runner can&apos;t reach <code className="font-mono">localhost</code> — set{" "}
              <code className="font-mono">NEXT_PUBLIC_OWNBOARD_INGEST_URL</code> to your public API
              URL (or an ngrok tunnel) before copying it, or the sync will fail to connect.
            </p>
          </div>
        )}

        <Separator />

        <Step n={1} title="Generate an ingest key">
          <p className="text-sm text-muted-foreground">
            Add it to your repo as a secret named <code className="font-mono">OWNBOARD_KEY</code>{" "}
            (Settings → Secrets and variables → Actions).
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={generate}
            disabled={createKey.isPending || activeKeys.length > 0}
          >
            {createKey.isPending ? <Spinner /> : <KeyRoundIcon />}
            Generate ingest key
          </Button>
          {activeKeys.length > 0 && (
            <p className="text-xs text-muted-foreground">
              This repo already has an active key. Revoke it below before generating a new one.
            </p>
          )}
          {freshToken && (
            <CodeSnippet label="Copy now — shown only once" code={freshToken} className="pt-1" />
          )}
          {activeKeys.length > 0 && (
            <div className="space-y-1 pt-1">
              {activeKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                >
                  <span className="font-mono">
                    {k.keyPrefix}…{" "}
                    {k.lastUsedAt
                      ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "never used"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-danger hover:text-danger"
                    onClick={() => revoke(k.id)}
                    disabled={revokeKey.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Step>

        <Step n={2} title="Add the workflow to your repo">
          <p className="text-sm text-muted-foreground">
            Commit this as <code className="font-mono">.github/workflows/ownboard.yml</code>.
          </p>
          <CodeSnippet code={workflowYaml()} />
        </Step>

        <Step n={3} title="Run it">
          <p className="text-sm text-muted-foreground">
            Use <span className="font-medium text-foreground">Sync now</span> above (or in your
            repo: Actions → OwnBoard sync → Run workflow). The skill graph appears here within a
            minute; semantic Q&amp;A follows once embeddings finish.
          </p>
        </Step>
      </CardContent>
    </Card>
  );
}
