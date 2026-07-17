"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { WORKSPACE_NAV } from "@/components/layout/nav-config";
import { useDocPack } from "@/hooks/queries/doc-pack/doc-pack.queries";
import { useAssignmentDetail } from "@/hooks/queries/pack-assignment/pack-assignment.queries";
import { APP_HOME } from "@/lib/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb";

type Crumb = {
  label: ReactNode;
  href?: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  "doc-packs": "Quizzes",
  new: "Create",
  onboarding: "Readiness",
  packs: "My quizzes",
  "policy-quiz": "Policy quiz",
  "codebase-quiz": "Codebase quiz",
  unlocked: "Unlocked",
  chat: "Archaeology",
  dashboard: "Skill map",
  admin: "Admin",
  settings: "Settings",
  organization: "Organization",
  team: "Team",
};

function navMatchForPath(pathname: string): { label: string; href: string } | null {
  for (const item of WORKSPACE_NAV.items) {
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

function labelForSegment(segment: string, opts: { isLast: boolean; section: string }): ReactNode {
  if (opts.isLast && opts.section === "doc-packs" && segment !== "new" && looksLikeId(segment)) {
    return <DocPackCrumbLabel packId={segment} />;
  }
  return SEGMENT_LABELS[segment] ?? (looksLikeId(segment) ? "Details" : titleCase(segment));
}

function assignmentCrumbs(rootLabel: string, rootHref: string, assignmentId: string): Crumb[] {
  return [
    { label: rootLabel, href: rootHref },
    { label: <AssignmentCrumbLabel assignmentId={assignmentId} /> },
  ];
}

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === APP_HOME || pathname === `${APP_HOME}/`) {
    return [{ label: "Codebases" }];
  }

  const parts = pathname.split("/").filter(Boolean);
  const consoleParts = parts[0] === "app" ? parts.slice(1) : parts;
  if (consoleParts.length === 0) {
    return [{ label: "Codebases" }];
  }

  const nav = navMatchForPath(pathname);
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
  const crumbs = buildCrumbs(pathname);

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
