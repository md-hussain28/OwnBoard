"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useDocPack, useDocPackQuiz } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { DocPackDocuments } from "@/components/doc-pack/doc-pack-documents";
import { DocPackQuizBuilder } from "@/components/doc-pack/doc-pack-quiz-builder";
import { DocPackAssignments } from "@/components/doc-pack/doc-pack-assignments";
import { Skeleton } from "@/ui/skeleton";
import { Badge } from "@/ui/badge";

export default function DocPackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: pack, isLoading, isError } = useDocPack(id);
  const quizQuery = useDocPackQuiz(id);

  const hasProcessedDocuments = (pack?.documents ?? []).some((d) => d.status === "processed");
  const quizPublished = Boolean(quizQuery.data?.isPublished);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/doc-packs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> All doc packs
        </Link>
        {isLoading && <Skeleton className="h-8 w-64" />}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Could not load this doc pack. Start the FastAPI service and refresh.
          </p>
        )}
        {pack && (
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{pack.name}</h1>
              {pack.status === "needs_review" && <Badge variant="destructive">Needs review</Badge>}
              {pack.status === "active" && <Badge>Active</Badge>}
            </div>
            {pack.description && <p className="text-muted-foreground">{pack.description}</p>}
          </div>
        )}
      </div>

      {pack && (
        <>
          <DocPackDocuments packId={pack.id} documents={pack.documents} />
          <DocPackQuizBuilder packId={pack.id} hasProcessedDocuments={hasProcessedDocuments} />
          <DocPackAssignments packId={pack.id} quizPublished={quizPublished} />
        </>
      )}
    </div>
  );
}
