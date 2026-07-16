"use client";

import { EmployeePackList } from "@/components/doc-pack/employee-pack-list";

export default function EmployeePacksPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assigned reading</h1>
        <p className="text-muted-foreground">
          Read every document in a pack, then pass its open-book quiz at 100% to complete it.
        </p>
      </div>
      <EmployeePackList />
    </div>
  );
}
