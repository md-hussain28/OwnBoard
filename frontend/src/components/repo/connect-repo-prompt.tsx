import { GitBranchIcon } from "lucide-react";
import Link from "next/link";
import { appPath } from "@/lib/routes";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

/** Empty state shown on knowledge-base surfaces before any repository has been connected. */
export function ConnectRepoPrompt({
  title = "No repository connected yet",
  description = "Connect a repository to build its skill graph, experts, and archaeology Q&A from git history.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
          <GitBranchIcon className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild>
          <Link href={appPath("repos")}>Connect a repository</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
