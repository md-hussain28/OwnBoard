"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { AssignmentWorkspace } from "@/components/doc-pack/assignment-workspace";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment/pack-assignment.queries";

export default function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const { data: detail } = useAssignmentDetail(assignmentId);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/app/onboarding/packs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Assigned reading
        </Link>
        <h1 className="text-2xl font-semibold">{detail?.docPackName ?? "Doc pack"}</h1>
        <p className="text-muted-foreground">
          Read and acknowledge each document, then take the quiz. 100% to pass.
        </p>
      </div>
      <AssignmentWorkspace assignmentId={assignmentId} />
    </div>
  );
}
