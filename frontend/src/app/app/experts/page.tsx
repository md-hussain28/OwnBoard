"use client";

import { useState } from "react";
import { ExpertReferralCard } from "@/components/expert";
import { ConnectRepoPrompt } from "@/components/repo";
import { useExpertForFile } from "@/hooks/queries/expert";
import { useRepos } from "@/hooks/queries/repo";
import { getApiErrorMessage } from "@/lib/api";
import { Button, Input, Skeleton, Spinner } from "@/ui";

export default function ExpertsPage() {
  const { data: repos, isLoading: reposLoading } = useRepos();
  const repo = repos?.[0];

  const [draft, setDraft] = useState("");
  const [filePath, setFilePath] = useState("");
  const referral = useExpertForFile(repo?.id ?? "", filePath);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFilePath(draft.trim());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Who to ask</h1>
        <p className="text-muted-foreground">
          Enter a file or folder and we&apos;ll route you to the person with the most relevant
          history — with the evidence and a drafted intro.
        </p>
      </div>

      {reposLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {!reposLoading && !repo && <ConnectRepoPrompt />}

      {repo && (
        <>
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
        </>
      )}
    </div>
  );
}
