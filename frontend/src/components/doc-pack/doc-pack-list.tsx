"use client";

import { useState } from "react";
import Link from "next/link";
import { useDocPacks } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useCreateDocPack } from "@/hooks/queries/doc-pack/doc-pack.mutations";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";
import type { DocPackListItem } from "@/schemas/docPack.schema";

const STATUS_LABEL: Record<DocPackListItem["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  needs_review: "Needs review",
};

function statusVariant(status: DocPackListItem["status"]) {
  if (status === "active") return "default" as const;
  if (status === "needs_review") return "destructive" as const;
  return "secondary" as const;
}

export function DocPackList() {
  const { data: packs, isLoading, isError, error } = useDocPacks();
  const createPack = useCreateDocPack();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createPack.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doc packs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Pack name (e.g. Security Onboarding)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" disabled={createPack.isPending}>
            {createPack.isPending ? "Creating..." : "Create pack"}
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not reach the backend ({error instanceof Error ? error.message : "unknown error"}).
            Start the FastAPI service and refresh.
          </p>
        )}

        {!isLoading && !isError && packs?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No doc packs yet. Create one, upload documents, and generate a quiz.
          </p>
        )}

        {!isLoading && !isError && packs && packs.length > 0 && (
          <ul className="space-y-2">
            {packs.map((pack) => (
              <li key={pack.id}>
                <Link
                  href={`/doc-packs/${pack.id}`}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-shadow duration-200 hover:shadow-soft"
                >
                  <div>
                    <p className="font-medium">{pack.name}</p>
                    {pack.description && (
                      <p className="text-sm text-muted-foreground">{pack.description}</p>
                    )}
                  </div>
                  <Badge variant={statusVariant(pack.status)}>{STATUS_LABEL[pack.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
