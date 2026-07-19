"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { useDocPack } from "@/hooks/queries/doc-pack";
import { useAppRole } from "@/hooks/queries/me";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment";
import { useProject } from "@/hooks/queries/project";
import { useRepo } from "@/hooks/queries/repo";
import { APP_HOME } from "@/lib";
import type { AppRole } from "@/schemas";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui";
import { navItemsForRole, PROJECT_SECTIONS, WORKSPACE_NAV } from "./nav-config";

type Crumb = {
  label: ReactNode;
  href?: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  "doc-packs": "Quizzes",
  new: "Create",
  onboarding: "Onboarding",
  packs: "My modules",
  "policy-quiz": "Policy quiz",
  "codebase-quiz": "Codebase quiz",
  unlocked: "Unlocked",
  chat: "Archaeology",
  dashboard: "Skill map",
  admin: "Admin",
  settings: "Settings",
  organization: "Organization",
  team: "Team",
  projects: "Projects",
  repos: "Repos",
  tracks: "Modules",
  assistant: "AI Assistant",
  // Project sub-nav sections (kept in sync with PROJECT_SECTIONS)
  ...Object.fromEntries(PROJECT_SECTIONS.filter((s) => s.key).map((s) => [s.key, s.label])),
};

function navMatchForPath(
  pathname: string,
  role?: AppRole | null,
): { label: string; href: string } | null {
  const items = role ? navItemsForRole(role) : WORKSPACE_NAV.items;
  for (const item of items) {
    if (item.href === APP_HOME) {
      if (pathname === APP_HOME || pathname === `${APP_HOME}/`) {
        return { label: item.label, href: item.href };
      }
      continue;
    }
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return { label: item.label, href: item.href };
    }
  }
  return null;
}

function looksLikeId(segment: string): boolean {
  return /^[a-zA-Z0-9_-]{12,}$/.test(segment) && !SEGMENT_LABELS[segment];
}

function titleCase(segment: string): string {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DocPackCrumbLabel({ packId }: { packId: string }) {
  const { data: pack, isLoading } = useDocPack(packId);
  if (isLoading && !pack) return <>…</>;
  return <>{pack?.name ?? "Quiz"}</>;
}

function AssignmentCrumbLabel({ assignmentId }: { assignmentId: string }) {
  const { data: detail, isLoading } = useAssignmentDetail(assignmentId);
  if (isLoading && !detail) return <>…</>;
  return <>{detail?.docPackName ?? "Pack"}</>;
}

function ProjectCrumbLabel({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  if (isLoading && !project) return <>…</>;
  return <>{project?.name ?? "Project"}</>;
}

function RepoCrumbLabel({ repoId }: { repoId: string }) {
  const { data: repo, isLoading } = useRepo(repoId);
  if (isLoading && !repo) return <>…</>;
  return <>{repo?.name ?? "Repository"}</>;
}

function labelForSegment(segment: string, opts: { isLast: boolean; section: string }): ReactNode {
  if (
    opts.isLast &&
    (opts.section === "doc-packs" || opts.section === "tracks") &&
    segment !== "new" &&
    looksLikeId(segment)
  ) {
    return <DocPackCrumbLabel packId={segment} />;
  }
  if (opts.section === "projects" && segment !== "new" && looksLikeId(segment)) {
    return <ProjectCrumbLabel projectId={segment} />;
  }
  if (opts.section === "repos" && looksLikeId(segment)) {
    return <RepoCrumbLabel repoId={segment} />;
  }
  return SEGMENT_LABELS[segment] ?? (looksLikeId(segment) ? "Details" : titleCase(segment));
}

function assignmentCrumbs(rootLabel: string, rootHref: string, assignmentId: string): Crumb[] {
  return [
    { label: rootLabel, href: rootHref },
    { label: <AssignmentCrumbLabel assignmentId={assignmentId} /> },
  ];
}

/** Projects → Project name → Section (e.g. Skill graph) → optional nested detail (e.g. a repo). */
function projectCrumbs(
  rootLabel: string,
  rootHref: string,
  projectId: string,
  sectionKey: string | undefined,
  subId?: string,
): Crumb[] {
  const projectHref = `${rootHref}/${projectId}`;
  const hasSub = Boolean(subId && looksLikeId(subId));
  const crumbs: Crumb[] = [
    { label: rootLabel, href: rootHref },
    {
      label: <ProjectCrumbLabel projectId={projectId} />,
      href: sectionKey ? projectHref : undefined,
    },
  ];
  if (sectionKey) {
    const sectionHref = `${projectHref}/${sectionKey}`;
    crumbs.push({
      label: SEGMENT_LABELS[sectionKey] ?? titleCase(sectionKey),
      // Keep the section clickable once there's a deeper crumb (e.g. a specific repo) after it.
      href: hasSub ? sectionHref : undefined,
    });
  }
  // A repo opened inside a project: Projects → name → Repos → repo name.
  if (hasSub && sectionKey === "repositories" && subId) {
    crumbs.push({ label: <RepoCrumbLabel repoId={subId} /> });
  }
  // An onboarding module authored inside a project: … → Project Onboarding → module name.
  if (hasSub && sectionKey === "onboarding" && subId) {
    crumbs.push({ label: <DocPackCrumbLabel packId={subId} /> });
  }
  return crumbs;
}

function buildCrumbs(pathname: string, role?: AppRole | null): Crumb[] {
  if (pathname === APP_HOME || pathname === `${APP_HOME}/`) {
    return [{ label: "Codebases" }];
  }

  const parts = pathname.split("/").filter(Boolean);
  const consoleParts = parts[0] === "app" ? parts.slice(1) : parts;
  if (consoleParts.length === 0) {
    return [{ label: "Codebases" }];
  }

  const nav = navMatchForPath(pathname, role);
  const rootHref = nav?.href ?? `${APP_HOME}/${consoleParts[0]}`;
  const rootLabel = nav?.label ?? SEGMENT_LABELS[consoleParts[0]] ?? titleCase(consoleParts[0]);

  // Employee assignment: My quizzes → pack name (skip redundant "packs" + raw id).
  const assignmentId = consoleParts[2];
  if (
    consoleParts[0] === "onboarding" &&
    consoleParts[1] === "packs" &&
    consoleParts.length === 3 &&
    assignmentId &&
    looksLikeId(assignmentId)
  ) {
    return assignmentCrumbs(rootLabel, rootHref, assignmentId);
  }

  // Project hub: Projects → name → optional section (skip raw id in the trail).
  const projectId = consoleParts[1];
  if (
    consoleParts[0] === "projects" &&
    projectId &&
    projectId !== "new" &&
    looksLikeId(projectId)
  ) {
    return projectCrumbs(rootLabel, rootHref, projectId, consoleParts[2], consoleParts[3]);
  }

  // Repo detail: Repos → repo name (skip opaque id).
  const repoId = consoleParts[1];
  if (consoleParts[0] === "repos" && repoId && looksLikeId(repoId)) {
    return [{ label: rootLabel, href: rootHref }, { label: <RepoCrumbLabel repoId={repoId} /> }];
  }

  if (consoleParts.length === 1 || pathname === rootHref || pathname === `${rootHref}/`) {
    return [{ label: rootLabel }];
  }

  const crumbs: Crumb[] = [{ label: rootLabel, href: rootHref }];
  const rootSegments = rootHref.replace(APP_HOME, "").split("/").filter(Boolean);
  let path = rootHref;
  for (let i = rootSegments.length; i < consoleParts.length; i++) {
    const segment = consoleParts[i];
    path = `${path}/${segment}`;
    const isLast = i === consoleParts.length - 1;
    const label = labelForSegment(segment, { isLast, section: consoleParts[0] ?? "" });
    crumbs.push(isLast ? { label } : { label, href: path });
  }

  return crumbs;
}

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const { appRole } = useAppRole();
  const crumbs = buildCrumbs(pathname, appRole);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${String(crumb.href)}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem className="min-w-0">
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
