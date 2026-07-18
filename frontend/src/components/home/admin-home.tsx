"use client";

import { useUser } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightIcon,
  BookTextIcon,
  CheckCircle2Icon,
  ClockAlertIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  GraduationCapIcon,
  NetworkIcon,
  PlusIcon,
  ShieldAlertIcon,
  UserRoundXIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ProjectStatusBadge } from "@/components/project/project-status";
import { QueryState } from "@/components/shared/query-state";
import {
  useAssignmentOutcomes,
  useCohortDashboard,
} from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { useProjects } from "@/hooks/queries/project/project.queries";
import { useRepos } from "@/hooks/queries/repo/repo.queries";
import { useExpertiseScores } from "@/hooks/queries/skill-graph/skill-graph.queries";
import { appPath } from "@/lib/routes";
import { type SubsystemRisk, subsystemRisks } from "@/lib/skill-graph";
import { cn } from "@/lib/utils";
import type { CohortDashboard } from "@/schemas/cohort.schema";
import type { AssignmentOutcome } from "@/schemas/packAssignment.schema";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { firstNameOf, HomeGreeting, SectionHeader } from "./home-primitives";

// ─── Status line ──────────────────────────────────────────────────────────

function peopleStillOnboarding(cohort: CohortDashboard): number {
  return cohort.employees.filter((e) => e.passedCount < e.totalCount).length;
}

function statusLine(cohort: CohortDashboard | undefined, highRiskCount: number): string {
  if (!cohort) {
    return "Here's the state of your team and where knowledge is concentrated.";
  }
  const onboarding = peopleStillOnboarding(cohort);
  const parts: string[] = [];
  if (onboarding > 0) {
    parts.push(`${onboarding} ${onboarding === 1 ? "person is" : "people are"} still onboarding`);
  }
  if (highRiskCount > 0) {
    parts.push(
      `${highRiskCount} ${highRiskCount === 1 ? "area" : "areas"} of the code only one person understands`,
    );
  }
  if (parts.length === 0) {
    return "Everyone's onboarded and knowledge is well spread — nothing needs you right now.";
  }
  // Capitalize the first clause, join with a middot.
  const joined = parts.join(" · ");
  return `${joined[0].toUpperCase()}${joined.slice(1)}.`;
}

// ─── Summary tiles ────────────────────────────────────────────────────────

const STAT_TONE_TEXT: Record<"neutral" | "warning" | "danger" | "success", string> = {
  neutral: "text-foreground",
  warning: "text-brand-amber",
  danger: "text-brand-coral",
  success: "text-brand-moss",
};

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  const toneText = STAT_TONE_TEXT[tone];
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className={cn("text-xl font-semibold tabular-nums", toneText)}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryTiles({
  cohort,
  highRiskCount,
}: {
  cohort: CohortDashboard;
  highRiskCount: number;
}) {
  const onboarding = peopleStillOnboarding(cohort);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="Onboarding complete"
        value={`${Math.round(cohort.completionPct)}%`}
        tone={cohort.completionPct >= 100 ? "success" : "neutral"}
      />
      <StatTile
        label={onboarding === 1 ? "Person onboarding" : "People onboarding"}
        value={String(onboarding)}
      />
      <StatTile
        label="Assignments overdue"
        value={String(cohort.overdueAssignments)}
        tone={cohort.overdueAssignments > 0 ? "warning" : "neutral"}
      />
      <StatTile
        label="Single-owner areas"
        value={String(highRiskCount)}
        tone={highRiskCount > 0 ? "danger" : "neutral"}
      />
    </div>
  );
}

// ─── Needs attention ──────────────────────────────────────────────────────

type AttentionItem = {
  id: string;
  tone: "danger" | "warning";
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  href: string;
};

const MAX_ATTENTION = 5;

function buildAttention(
  cohort: CohortDashboard | undefined,
  outcomes: AssignmentOutcome[],
  topRisk: SubsystemRisk | undefined,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const flaggedEmployees = new Set<string>();

  // 1. Recent quiz failures — most actionable.
  const failed = [...outcomes]
    .filter((o) => o.status === "failed")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  for (const o of failed.slice(0, 3)) {
    flaggedEmployees.add(o.employeeId);
    items.push({
      id: `fail-${o.id}`,
      tone: "danger",
      icon: XCircleIcon,
      title: `${o.employeeName} didn't pass ${o.docPackName}`,
      subtitle: "Review the module or reach out",
      href: appPath("tracks", o.docPackId),
    });
  }

  // 2. People who've started but passed nothing — likely stuck.
  if (cohort) {
    const stuck = cohort.employees.filter(
      (e) => e.totalCount > 0 && e.passedCount === 0 && !flaggedEmployees.has(e.employeeId),
    );
    for (const e of stuck.slice(0, 2)) {
      items.push({
        id: `stuck-${e.employeeId}`,
        tone: "warning",
        icon: UserRoundXIcon,
        title: `${e.employeeName} hasn't passed any module yet`,
        subtitle: `0 of ${e.totalCount} done — they may be stuck`,
        href: appPath("tracks"),
      });
    }
  }

  // 3. Overdue work — one summary line.
  if (cohort && cohort.overdueAssignments > 0) {
    items.push({
      id: "overdue",
      tone: "warning",
      icon: ClockAlertIcon,
      title: `${cohort.overdueAssignments} assignment${cohort.overdueAssignments === 1 ? "" : "s"} overdue`,
      subtitle: "Past their due date and not yet passed",
      href: appPath("tracks"),
    });
  }

  // 4. A single bus-factor risk — where knowledge is dangerously concentrated.
  if (topRisk) {
    items.push({
      id: "risk",
      tone: "danger",
      icon: ShieldAlertIcon,
      title: `Only ${topRisk.topContributorName} understands ${topRisk.subsystem}`,
      subtitle: "One person holds this area — a bus-factor risk",
      href: appPath("dashboard"),
    });
  }

  return items.slice(0, MAX_ATTENTION);
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.icon;
  const wellClass =
    item.tone === "danger"
      ? "bg-brand-coral-soft text-brand-coral"
      : "bg-brand-honey-soft text-brand-amber";
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-[box-shadow,border-color] duration-200 hover:border-primary/20 hover:shadow-soft"
      >
        <span
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", wellClass)}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          {item.subtitle && (
            <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
          )}
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function AttentionBody({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <Card className="border-brand-moss/25 bg-brand-moss-soft/25">
        <CardContent className="flex items-center gap-3 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-moss-soft text-brand-moss">
            <CheckCircle2Icon className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Nothing needs you right now. Everyone&apos;s moving and knowledge is well spread.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <AttentionRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function NeedsAttention({ items, loading }: { items: AttentionItem[]; loading: boolean }) {
  return (
    <section className="space-y-3">
      <SectionHeader title="Needs your attention" hint="Only the things worth acting on today" />
      <AttentionBody items={items} loading={loading} />
    </section>
  );
}

// ─── Projects ─────────────────────────────────────────────────────────────

function ProjectsSection() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const visible = (projects ?? []).filter((p) => !p.isArchived);

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Your projects"
        hint="Team spaces and their onboarding"
        action={{ label: "View all", href: appPath("projects") }}
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={visible.length === 0}
        loading={<Skeleton className="h-28 w-full rounded-xl" />}
        empty={
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-honey-soft text-brand-honey">
                <FolderKanbanIcon className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one to give a team its own onboarding.
              </p>
              <Button asChild size="sm">
                <Link href={appPath("projects")}>
                  <PlusIcon /> New project
                </Link>
              </Button>
            </CardContent>
          </Card>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.slice(0, 6).map((project) => (
            <Link key={project.id} href={appPath("projects", project.id)} className="group">
              <Card className="h-full transition-shadow duration-200 group-hover:shadow-soft">
                <CardContent className="flex h-full flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold leading-tight">{project.name}</p>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <UsersIcon className="size-3.5" /> {project.memberCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GraduationCapIcon className="size-3.5" /> {project.trackCount} onboarding
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BookTextIcon className="size-3.5" /> {project.moduleCount} doc
                      {project.moduleCount === 1 ? "" : "s"}
                    </span>
                    {project.repoName && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <GitBranchIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{project.repoName}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </QueryState>
    </section>
  );
}

// ─── Risk highlight ───────────────────────────────────────────────────────

function RiskHighlight({ topRisk }: { topRisk: SubsystemRisk }) {
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

// ─── First-run setup ──────────────────────────────────────────────────────

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

function SetupWalkthrough({ hasRepo, hasProject }: { hasRepo: boolean; hasProject: boolean }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────

export function AdminHome() {
  const { user } = useUser();
  const name = firstNameOf(user?.firstName ?? user?.fullName);

  const cohortQuery = useCohortDashboard();
  const outcomesQuery = useAssignmentOutcomes();
  const projectsQuery = useProjects();
  const reposQuery = useRepos();
  const repo = reposQuery.data?.[0];
  const expertiseQuery = useExpertiseScores(repo?.id ?? "");

  const risks = useMemo(() => subsystemRisks(expertiseQuery.data ?? []), [expertiseQuery.data]);
  const highRisks = useMemo(() => risks.filter((r) => r.riskLevel === "high"), [risks]);
  const topRisk = highRisks[0];

  const cohort = cohortQuery.data;
  const status = statusLine(cohort, highRisks.length);

  const attention = useMemo(
    () => buildAttention(cohort, outcomesQuery.data ?? [], topRisk),
    [cohort, outcomesQuery.data, topRisk],
  );

  // Brand new: no projects and no repos connected yet.
  const isBrandNew =
    !projectsQuery.isLoading &&
    !reposQuery.isLoading &&
    (projectsQuery.data?.length ?? 0) === 0 &&
    (reposQuery.data?.length ?? 0) === 0;

  const summaryLoading = cohortQuery.isLoading || reposQuery.isLoading || expertiseQuery.isLoading;
  const attentionLoading = cohortQuery.isLoading || outcomesQuery.isLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <HomeGreeting name={name} line={status} loading={cohortQuery.isLoading} />

      {isBrandNew ? (
        <SetupWalkthrough
          hasRepo={(reposQuery.data?.length ?? 0) > 0}
          hasProject={(projectsQuery.data?.length ?? 0) > 0}
        />
      ) : (
        <>
          {summaryLoading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : (
            cohort && <SummaryTiles cohort={cohort} highRiskCount={highRisks.length} />
          )}

          <NeedsAttention items={attention} loading={attentionLoading} />

          {topRisk && repo && <RiskHighlight topRisk={topRisk} />}

          <ProjectsSection />
        </>
      )}
    </div>
  );
}
