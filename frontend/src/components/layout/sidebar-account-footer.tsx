"use client";

import { UserButton } from "@clerk/nextjs";
import { dark, shadcn } from "@clerk/ui/themes";
import { ThemeSettings } from "@/components/layout/theme-settings";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { useAppRole } from "@/hooks/queries/me/me.queries";
import {
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/ui/sidebar";
import { cn } from "@/lib/utils";

/** Shared ghost trigger — matches nav item rhythm. */
const sidebarTabTrigger = cn(
  "flex h-9 w-full! items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-left text-[0.8125rem]",
  "font-medium text-sidebar-foreground/80 outline-hidden",
  "transition-[color,background-color] duration-150 ease-out",
  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  "border-0! bg-transparent! shadow-none!",
);

export function SidebarAccountFooter() {
  const { isAdmin, isLoading: roleLoading } = useAppRole();
  const { state, isMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const showTeam = !roleLoading && isAdmin;

  const appearance = {
    theme: [shadcn, dark],
    elements: {
      userButtonPopoverRootBox: "z-50 pointer-events-auto!",
      userButtonPopoverCard: "pointer-events-auto!",
      rootBox: cn(
        "relative z-20 flex! h-9! items-center!",
        collapsed ? "w-auto!" : "w-full!",
      ),
      // Clerk DOM is name-then-avatar; order forces avatar → name → (settings beside).
      userButtonBox: cn(
        "flex! h-9! flex-row items-center! justify-start gap-2.5",
        collapsed ? "w-auto! justify-center gap-0" : "w-full!",
      ),
      userButtonOuterIdentifier: cn(
        "order-2 min-w-0 flex-1 truncate text-left text-[0.8125rem] font-medium leading-none text-sidebar-foreground/85",
        collapsed && "hidden",
      ),
      userButtonTrigger: cn(
        sidebarTabTrigger,
        "justify-start! items-center! pr-1!",
        collapsed && "size-8! w-8! justify-center! gap-0 px-0! pr-0!",
      ),
      userButtonAvatarBox: "order-1 size-5! shrink-0 self-center rounded-full",
    },
  };

  return (
    <SidebarFooter
      className={cn(
        "relative z-20 mt-auto gap-1 border-t border-sidebar-border p-2 pb-2.5",
        collapsed && "items-center",
      )}
    >
      {showTeam && (
        <>
          <div
            className={cn(
              "relative z-20 flex items-center px-0.5",
              collapsed && "h-8 w-full justify-center px-0",
            )}
          >
            <WorkspaceSwitcher />
          </div>

          <SidebarSeparator
            className={cn(
              "mx-1 my-1 bg-sidebar-border/80",
              collapsed && "mx-0 w-8",
            )}
          />
        </>
      )}

      <div
        className={cn(
          "relative z-20 flex h-9 items-center gap-0.5 px-0.5",
          collapsed && "h-8 w-full justify-center px-0",
        )}
      >
        <div
          className={cn(
            "flex h-9 min-w-0 flex-1 items-center overflow-hidden",
            collapsed && "h-8 w-full flex-none justify-center",
          )}
        >
          <UserButton
            appearance={appearance}
            showName={!collapsed}
            userProfileMode="modal"
          />
        </div>
        {!collapsed && (
          <ThemeSettings className="flex h-9 shrink-0 items-center justify-center" />
        )}
      </div>
    </SidebarFooter>
  );
}
