"use client";

import { useAuth, useClerk, useOrganization } from "@clerk/nextjs";
import { ChevronRightIcon, UsersRoundIcon } from "lucide-react";
import { useSidebar } from "@/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/tooltip";
import { cn } from "@/lib/utils";

/** Clerk's auto-generated default logos encode `"type":"default"` in the path. */
function isClerkDefaultLogo(url?: string | null) {
  if (!url) return true;
  return url.includes("ZGVmYXVsdA"); // base64url fragment of `"type":"default"`
}

/**
 * Org-admin control — opens Clerk Organization Profile (members, name, logo).
 * Hidden for `org:member` and anyone without `org:admin`.
 */
export function WorkspaceSwitcher() {
  const { has, isLoaded: authLoaded } = useAuth();
  const { openOrganizationProfile } = useClerk();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";

  const isOrgAdmin = !!has?.({ role: "org:admin" });
  const showLogo =
    !!organization?.imageUrl && !isClerkDefaultLogo(organization.imageUrl);
  const ready = authLoaded && orgLoaded && !!organization && isOrgAdmin;

  if (!authLoaded || !isOrgAdmin) {
    return null;
  }

  function openProfile() {
    if (!ready) return;
    openOrganizationProfile();
  }

  const trigger = (
    <button
      type="button"
      aria-label="Manage team"
      disabled={!ready}
      onClick={openProfile}
      className={cn(
        "flex h-9 w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left",
        "outline-hidden transition-[color,background-color] duration-150 ease-out",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        collapsed && "size-8! justify-center px-0!",
      )}
    >
      {collapsed ? (
        <UsersRoundIcon
          className="size-4 shrink-0 text-sidebar-foreground/80"
          strokeWidth={1.75}
        />
      ) : (
        <>
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-honey/15">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- custom org logos only
              <img
                src={organization!.imageUrl}
                alt=""
                className="size-7 rounded-md object-cover"
              />
            ) : (
              <UsersRoundIcon
                className="size-3.5 text-brand-honey"
                strokeWidth={1.75}
              />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium leading-none text-sidebar-foreground">
            Manage team
          </span>
          <ChevronRightIcon
            className="size-3.5 shrink-0 text-sidebar-foreground/40"
            strokeWidth={1.75}
          />
        </>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <div className="relative z-20 w-full min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={6}>
            Manage team
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return <div className="relative z-20 w-full min-w-0">{trigger}</div>;
}
