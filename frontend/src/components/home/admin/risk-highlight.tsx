import { ArrowRightIcon, NetworkIcon } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/home";
import type { SubsystemRisk } from "@/lib";
import { appPath } from "@/lib";
import { Button, Card, CardContent } from "@/ui";

export function RiskHighlight({ topRisk }: { topRisk: SubsystemRisk }) {
  const share = Math.round(topRisk.topShare * 100);
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Knowledge risk"
        hint="Where understanding is dangerously concentrated"
      />
      <Card className="border-brand-coral/25">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-coral-soft text-brand-coral">
              <NetworkIcon className="size-5" />
            </span>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-balance">
                {topRisk.subsystem} rests on one person
              </p>
              <p className="text-sm text-muted-foreground">
                {topRisk.topContributorName} owns {share}% of this area. If they&apos;re out, this
                is where you&apos;d feel it first.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={appPath("dashboard")}>
              See the skill graph
              <ArrowRightIcon />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
