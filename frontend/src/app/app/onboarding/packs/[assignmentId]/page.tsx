"use client";

import { use } from "react";
import { AssignmentWorkspace } from "@/components/doc-pack/assignment-workspace";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment/pack-assignment.queries";

export default function AssignmentPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const { data: detail } = useAssignmentDetail(assignmentId);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {detail?.docPackName ?? "Module"}
        </h1>
        <p className="text-pretty text-muted-foreground">
          Read and acknowledge each document, then take the quiz. 100% to pass.
        </p>
      </div>
      <AssignmentWorkspace assignmentId={assignmentId} />
    </div>
  );
}
