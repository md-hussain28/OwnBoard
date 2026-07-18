"use client";

import { useOrganization } from "@clerk/nextjs";
import { FolderKanbanIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import {
  isNavItemActive,
  isProjectSectionActive,
  type NavItem,
  navItemsForRole,
  projectIdFromPathname,
  projectSectionPath,
  projectSectionsForRole,
  WORKSPACE_NAV,
} from "@/components/layout/nav-config";
import { SidebarAccountFooter } from "@/components/layout/sidebar-account-footer";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import { useProject } from "@/hooks/queries/project/project.queries";
import { appPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/ui/sidebar";
import { Skeleton } from "@/ui/skeleton";

/** Clerk's auto-generated default logos encode `"type":"default"` in the path. */
function isClerkDefaultLogo(url?: string | null) {
  if (!url) return true;
  return url.includes("ZGVmYXVsdA"); // base64url fragment of `"type":"default"`
}

function orgInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Ob";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function isProjectsNavItem(item: NavItem): boolean {
  return item.href === appPath("projects");
}

const nestItemClass = (active: boolean) =>
  cn(
    "h-7 gap-2 rounded-lg px-2 text-[0.75rem] font-medium",
    "text-sidebar-foreground/65",
    "transition-[color,background-color] duration-150 ease-out",
    "hover:bg-sidebar-accent/80",
    active &&
      "bg-sidebar-accent font-semibold text-sidebar-primary shadow-sm data-active:bg-sidebar-accent data-active:text-sidebar-primary",
  );

/** Rounded L-elbow + optional continuing vertical rail (file-tree style, not sharp Reddit stubs). */
function HierarchyElbow({
  isLast,
  /** Extra classes for the elbow stem — use to pull the line up into a parent row. */
  stemClassName,
}: {
  isLast: boolean;
  stemClassName?: string;
}) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-3.5">
      {/* Rounded corner into the row midpoint; stem can extend upward into the parent */}
      <span
        className={cn(
          "absolute left-0 w-3 rounded-bl-[7px] border-b border-l border-sidebar-foreground/25",
          stemClassName ?? "top-0 h-1/2",
        )}
      />
      {/* Keep the vertical rail going for siblings below */}
      {!isLast && (
        <span className="absolute top-1/2 bottom-0 left-0 w-px bg-sidebar-foreground/25" />
      )}
    </span>
  );
}

/**
 * Active project + its sections, nested under the Projects nav item.
 * Projects → Project name → sections, with rounded hierarchy lines.
 */
function ProjectNest({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { data: project } = useProject(projectId);
  // Overview is the project name row itself — don't list it twice.
  const sections = projectSectionsForRole(project?.canManage ?? false).filter((s) => s.key !== "");
  const onOverview = isProjectSectionActive(pathname, projectId, "");
  const hasSections = sections.length > 0;

  return (
    <>
      {/*
        Rail aligns under the Projects icon center (px-2 + size-7/2 = 1.375rem).
        Stem pulls up into the Projects row so the line reads as connected.
      */}
      <SidebarMenuSub
        className={cn(
          "mx-0 ml-[1.375rem] mt-0 translate-x-0 gap-0 border-0 px-0 py-0",
          "group-data-[collapsible=icon]:hidden",
        )}
      >
        {/* Projects → project */}
        <SidebarMenuSubItem className="relative pl-3.5">
          {/*
            Elbow must be scoped to the project-name row only. If it sits on this
            SubItem, bottom-1/2 is the midpoint of the whole section tree.
          */}
          <div className="relative -ml-3.5 pl-3.5">
            <HierarchyElbow
              isLast
              // Reach up to the Projects icon midline (~half of the ~44px parent row).
              stemClassName="bottom-1/2 -top-6"
            />
            <SidebarMenuSubButton
              asChild
              size="sm"
              isActive={onOverview}
              className={cn(
                nestItemClass(onOverview),
                "translate-x-0 font-semibold text-sidebar-foreground/80",
              )}
            >
              <Link href={projectSectionPath(projectId, "")}>
                <FolderKanbanIcon className="size-3 shrink-0 opacity-70" strokeWidth={1.75} />
                <span className="truncate">{project?.name ?? "Project"}</span>
              </Link>
            </SidebarMenuSubButton>
          </div>

          {/* Project → sections */}
          {hasSections && (
            <SidebarMenuSub
              className={cn(
                "mx-0 ml-3.5 mt-0 translate-x-0 gap-0 border-0 px-0 py-0",
                "group-data-[collapsible=icon]:hidden",
              )}
            >
              {sections.map((section, index) => {
                const active = isProjectSectionActive(pathname, projectId, section.key);
                const isLast = index === sections.length - 1;
                return (
                  <SidebarMenuSubItem key={section.key} className="relative pl-3.5">
                    <HierarchyElbow
                      isLast={isLast}
                      stemClassName={
                        index === 0 ? "bottom-1/2 -top-3.5" : undefined
                      }
                    />
                    <SidebarMenuSubButton
                      asChild
                      size="sm"
                      isActive={active}
                      className={cn(nestItemClass(active), "translate-x-0")}
                    >
                      <Link href={projectSectionPath(projectId, section.key)}>
                        <section.icon className="size-3 shrink-0 opacity-70" strokeWidth={1.75} />
                        <span className="truncate">{section.label}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          )}
        </SidebarMenuSubItem>
      </SidebarMenuSub>

      {/* Collapsed icon rail: overview + section icons stay reachable */}
      <SidebarMenu className="mt-0.5 hidden gap-0.5 group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={onOverview}
            tooltip={project?.name ?? "Overview"}
            className={cn(
              "size-8! gap-0 rounded-lg p-0!",
              "text-sidebar-foreground/70",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              onOverview &&
                "bg-sidebar-accent font-semibold text-sidebar-primary data-active:bg-sidebar-accent data-active:text-sidebar-primary",
            )}
          >
            <Link href={projectSectionPath(projectId, "")}>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg",
                  onOverview
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "text-sidebar-foreground/65",
                )}
              >
                <FolderKanbanIcon className="size-3.5 shrink-0" strokeWidth={1.75} />
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {sections.map((section) => {
          const active = isProjectSectionActive(pathname, projectId, section.key);
          return (
            <SidebarMenuItem key={`icon-${section.key}`}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={section.label}
                className={cn(
                  "size-8! gap-0 rounded-lg p-0!",
                  "text-sidebar-foreground/70",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active &&
                    "bg-sidebar-accent font-semibold text-sidebar-primary data-active:bg-sidebar-accent data-active:text-sidebar-primary",
                )}
              >
                <Link href={projectSectionPath(projectId, section.key)}>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      active
                        ? "bg-sidebar-primary/15 text-sidebar-primary"
                        : "text-sidebar-foreground/65",
                    )}
                  >
                    <section.icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
}

function NavItems({
  items,
  activeProjectId,
}: {
  items: NavItem[];
  activeProjectId: string | null;
}) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        const showProjectNest = Boolean(activeProjectId && isProjectsNavItem(item));

        return (
          <SidebarMenuItem key={`${item.href}-${item.label}`}>
            <SidebarMenuButton
              asChild
              isActive={active && !showProjectNest}
              tooltip={item.label}
              className={cn(
                "h-auto min-h-9 gap-2.5 rounded-lg px-2 py-2 text-[0.8125rem] font-medium leading-none tracking-normal",
                "text-sidebar-foreground/70",
                "transition-[color,background-color] duration-150 ease-out",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0!",
                active &&
                  "bg-sidebar-accent font-semibold text-sidebar-primary data-active:bg-sidebar-accent data-active:font-semibold data-active:text-sidebar-primary",
                item.incoming && !active && "text-sidebar-foreground/45",
                item.incoming && "pr-[4.5rem] group-data-[collapsible=icon]:pr-0!",
              )}
            >
              <Link href={item.href}>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                    "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "bg-sidebar-foreground/6 text-sidebar-foreground/65",
                  )}
                >
                  <item.icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate leading-none">{item.label}</span>
                  {item.description && (
                    <span
                      className={cn(
                        "mt-1 block truncate text-[0.625rem] font-normal leading-none",
                        active ? "text-sidebar-primary/70" : "text-sidebar-foreground/40",
                      )}
                    >
                      {item.description}
                    </span>
                  )}
                </span>
              </Link>
            </SidebarMenuButton>
            {item.incoming && (
              <SidebarMenuBadge
                className={cn(
                  "right-2 top-1/2 h-5 -translate-y-1/2 rounded-md px-1.5",
                  "border-0 bg-sidebar-foreground/8 text-[0.625rem] font-medium leading-none",
                  "text-sidebar-foreground/55",
                  "peer-hover/menu-button:bg-sidebar-foreground/12 peer-hover/menu-button:text-sidebar-foreground/70",
                  "peer-data-active/menu-button:bg-sidebar-primary/15 peer-data-active/menu-button:text-sidebar-primary",
                )}
              >
                Soon
              </SidebarMenuBadge>
            )}
            {showProjectNest && activeProjectId && <ProjectNest projectId={activeProjectId} />}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { appRole, isLoading } = useAppRole();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const pathname = usePathname();
  const items = navItemsForRole(appRole);
  const activeProjectId = projectIdFromPathname(pathname);

  const orgName = organization?.name?.trim() || "OwnBoard";
  const showLogo = !!organization?.imageUrl && !isClerkDefaultLogo(organization.imageUrl);
  const logoUrl = showLogo && organization ? organization.imageUrl : null;
  const fallbackMark = orgLoaded ? orgInitials(orgName) : "Ob";

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="font-sans">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={orgName}
              className="h-8 gap-2.5 px-1 hover:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
            >
              <Link href="/app">
                <span
                  className={cn(
                    "flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[0.6875rem] font-bold leading-none tracking-tight text-white shadow-button",
                    logoUrl || !organization ? "bg-transparent" : "bg-brand-gradient",
                  )}
                >
                  {logoUrl ? (
                    // Custom org logos from Clerk
                    <Image
                      src={logoUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="size-full object-cover"
                    />
                  ) : !organization ? (
                    <BrandMark className="size-full" />
                  ) : (
                    fallbackMark
                  )}
                </span>
                <span className="truncate text-[0.9375rem] font-semibold leading-none tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  {orgName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-0 py-1">
        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="mb-2 px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40 group-data-[collapsible=icon]:mb-0">
            {WORKSPACE_NAV.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {isLoading ? (
              <div className="space-y-2 px-1 py-1">
                <Skeleton className="h-9 w-full rounded-lg bg-sidebar-foreground/10" />
                <Skeleton className="h-9 w-full rounded-lg bg-sidebar-foreground/10" />
              </div>
            ) : (
              <NavItems items={items} activeProjectId={activeProjectId} />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarAccountFooter />
      <SidebarRail />
    </Sidebar>
  );
}
