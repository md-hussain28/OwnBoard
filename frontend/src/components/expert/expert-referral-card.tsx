import { UserCheckIcon } from "lucide-react";
import type { ExpertReferral } from "@/schemas";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/ui";

/** "Who to ask" card — the routed expert, why them, and a ready-to-send intro (PRD §6.6). */
export function ExpertReferralCard({ referral }: { referral: ExpertReferral }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className="flex size-7 items-center justify-center rounded-full bg-brand-teal-soft text-brand-teal">
            <UserCheckIcon className="size-4" />
          </span>
          {referral.contributorName}
          <Badge variant="secondary" className="font-mono">
            {Math.round(referral.confidence * 100)}% match
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Why them</p>
          <ul className="list-inside list-disc space-y-0.5 text-foreground">
            {referral.evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {referral.draftMessage && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Drafted intro message</p>
            <p className="whitespace-pre-wrap rounded-md bg-muted p-3">{referral.draftMessage}</p>
          </div>
        )}
        {referral.backupContributorName && (
          <p className="text-xs text-muted-foreground">
            Backup expert: <span className="font-medium">{referral.backupContributorName}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
