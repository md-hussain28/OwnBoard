"use client";

import { useState } from "react";
import { ExpertReferralCard } from "@/components/expert";
import { ProjectNeedsRepo, primaryProjectRepoId } from "@/components/project";
import { useExpertForFile } from "@/hooks/queries/expert";
import { useProject } from "@/hooks/queries/project";
import { getApiErrorMessage } from "@/lib/api";
import { Button, Input, Skeleton, Spinner } from "@/ui";

export function ProjectExpertsView({ id }: { id: string }) {
  const { data: project } = useProject(id);

  const [draft, setDraft] = useState("");
  const [filePath, setFilePath] = useState("");
  const repoId = project ? primaryProjectRepoId(project) : null;
  const referral = useExpertForFile(repoId ?? "", filePath);

  if (!project) return null;
  if (!repoId) return <ProjectNeedsRepo projectId={project.id} canManage={project.canManage} />;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFilePath(draft.trim());
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter a file or folder and we&apos;ll route you to the person with the most relevant history
        — with the evidence and a drafted intro.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. src/auth/login.py or src/billing"
          className="font-mono"
        />
        <Button type="submit" disabled={!draft.trim() || referral.isFetching}>
          {referral.isFetching && <Spinner />}
          Find expert
        </Button>
      </form>

      {filePath && referral.isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {filePath && referral.isError && (
        <p className="text-sm text-muted-foreground">{getApiErrorMessage(referral.error)}</p>
      )}
      {referral.data && <ExpertReferralCard referral={referral.data} />}
    </div>
  );
}
