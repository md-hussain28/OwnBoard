"use client";

import { DocPackList } from "@/components/doc-pack/doc-pack-list";

export default function DocPacksPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Doc packs</h1>
        <p className="text-muted-foreground">
          Group real documents under one name, generate a cited quiz, and assign it to hires.
        </p>
      </div>
      <DocPackList />
    </div>
  );
}
