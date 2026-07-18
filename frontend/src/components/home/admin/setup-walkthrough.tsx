import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { appPath, cn } from "@/lib";
import { Button } from "@/ui";

function SetupStep({
  index,
  title,
  description,
  done,
  cta,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  cta: { label: string; href: string };
}) {
  return (
    <li className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          done ? "bg-brand-moss-soft text-brand-moss" : "bg-brand-honey-soft text-brand-honey",
        )}
      >
        {done ? <CheckCircle2Icon className="size-4" /> : index}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant={done ? "ghost" : "default"} size="sm" className="shrink-0">
        <Link href={cta.href}>{done ? "Review" : cta.label}</Link>
      </Button>
    </li>
  );
}

export function SetupWalkthrough({
  hasRepo,
  hasProject,
}: {
  hasRepo: boolean;
  hasProject: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Let&apos;s set up OwnBoard</h2>
        <p className="text-sm text-muted-foreground">
          A few short steps and your team gets grounded onboarding, a real skill graph, and expert
          routing.
        </p>
      </div>
      <ul className="space-y-2">
        <SetupStep
          index={1}
          title="Connect a repository"
          description="Grounds quizzes, the skill graph, and archaeology in real git history."
          done={hasRepo}
          cta={{ label: "Connect", href: appPath("repos") }}
        />
        <SetupStep
          index={2}
          title="Create your first project"
          description="A team space with its own onboarding members complete before they get access."
          done={hasProject}
          cta={{ label: "Create", href: appPath("projects") }}
        />
        <SetupStep
          index={3}
          title="Invite your team"
          description="Add teammates so you can assign onboarding and see how they're doing."
          done={false}
          cta={{ label: "Invite", href: appPath("team") }}
        />
      </ul>
    </section>
  );
}
