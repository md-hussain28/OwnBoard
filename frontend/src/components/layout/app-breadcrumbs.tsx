"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { WORKSPACE_NAV } from "@/components/layout/nav-config";
import { useDocPack } from "@/hooks/queries/doc-pack/doc-pack.queries";
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

function navLabelForPath(pathname: string): string | null {
  for (const item of WORKSPACE_NAV.items) {
    if (item.href === "/") {
      if (pathname === "/") return item.label;
      continue;
    }
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
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

function buildCrumbs(pathname: string): Crumb[] {
  if (pathname === "/") {
    return [{ label: "Codebases" }];
  }

  const parts = pathname.split("/").filter(Boolean);
  const rootHref = `/${parts[0]}`;
  const rootLabel = navLabelForPath(pathname) ?? SEGMENT_LABELS[parts[0]] ?? titleCase(parts[0]);

  if (parts.length === 1) {
    return [{ label: rootLabel }];
  }

  const crumbs: Crumb[] = [{ label: rootLabel, href: rootHref }];

  let path = rootHref;
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    path = `${path}/${segment}`;
    const isLast = i === parts.length - 1;

    let label: ReactNode =
      SEGMENT_LABELS[segment] ?? (looksLikeId(segment) ? "Details" : titleCase(segment));

    if (isLast && parts[0] === "doc-packs" && segment !== "new" && looksLikeId(segment)) {
      label = <DocPackCrumbLabel packId={segment} />;
    }

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
