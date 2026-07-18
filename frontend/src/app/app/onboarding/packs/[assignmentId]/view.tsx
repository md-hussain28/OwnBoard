"use client";

import { AssignmentWorkspace } from "@/components/doc-pack/assignment-workspace";
import { MemberOnlyGate } from "@/components/onboarding/member-only-gate";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment/pack-assignment.queries";

export function AssignmentView({ assignmentId }: { assignmentId: string }) {
  const { data: detail } = useAssignmentDetail(assignmentId);

  return (
    <MemberOnlyGate>
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
    </MemberOnlyGate>
  );
}
