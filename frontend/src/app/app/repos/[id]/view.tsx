"use client";

import { BrainIcon, MessagesSquareIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { RepoConnectPanel } from "@/components/repo/repo-connect-panel";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { useRepo } from "@/hooks/queries/repo/repo.queries";
import { getApiErrorMessage } from "@/lib/api/errors";
import { appPath } from "@/lib/routes";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

const EXPLORE = [
  { href: appPath("dashboard"), label: "Skill graph", icon: BrainIcon },
  { href: appPath("experts"), label: "Who to ask", icon: UsersIcon },
  { href: appPath("chat"), label: "Ask the codebase", icon: MessagesSquareIcon },
];

export function RepoDetailView({ id }: { id: string }) {
  const { isAdmin } = useAppRole();
  const { data: repo, isLoading, isError, error } = useRepo(id);

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (isError || !repo) {
    return (
      <p className="text-sm text-muted-foreground">
        {isError ? getApiErrorMessage(error) : "Repository not found."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{repo.name}</h1>
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          {repo.url}
        </a>
      </div>

      {isAdmin ? (
        <RepoConnectPanel repo={repo} />
      ) : (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            {repo.ingestedAt
              ? `Last synced ${new Date(repo.ingestedAt).toLocaleString()}.`
              : "This repository hasn't been synced yet."}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {EXPLORE.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="group">
            <Card className="transition-shadow group-hover:shadow-soft">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-teal-soft text-brand-teal">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
