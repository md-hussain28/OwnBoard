"use client";

import { EmployeePackList } from "@/components/doc-pack";
import { MemberOnlyGate } from "@/components/onboarding";

export default function EmployeePacksPage() {
  return (
    <MemberOnlyGate>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">My modules</h1>
          <p className="text-pretty text-muted-foreground">
            Read every document in a module, then pass its quiz at 100% to complete it. New
            assignments also show up on the bell in the top right.
          </p>
        </div>
        <EmployeePackList />
      </div>
    </MemberOnlyGate>
  );
}
