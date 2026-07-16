import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { ConnectedReposList } from "@/components/repo/connected-repos-list";

const FLOWS = [
  {
    href: "/onboarding",
    title: "New hire",
    description:
      "Policy quiz, codebase quiz, and repo access unlock, each grounded in cited evidence.",
  },
  {
    href: "/chat",
    title: "Archaeology Q&A",
    description:
      "Ask why the code works the way it does; get a cited, commit-grounded answer or an expert hand-off.",
  },
  {
    href: "/dashboard",
    title: "Engineering manager",
    description: "Bus-factor heatmap and quiz pass-rate analytics per subsystem.",
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold">Onboard</h1>
        <p className="max-w-2xl text-muted-foreground">
          Onboard turns a codebase and its git history into a cited onboarding path: a
          scenario-based policy quiz, a codebase-readiness quiz, and an archaeology-mode Q&A
          that explains why the code is the way it is, backed by real commits.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FLOWS.map((flow) => (
          <Link key={flow.href} href={flow.href}>
            <Card className="h-full transition-colors hover:border-foreground/30">
              <CardHeader>
                <CardTitle>{flow.title}</CardTitle>
                <CardDescription>{flow.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <ConnectedReposList />
      </section>
    </div>
  );
}
