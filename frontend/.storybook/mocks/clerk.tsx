import React from "react";

/**
 * Storybook stand-in for `@clerk/nextjs`, aliased in `.storybook/main.ts`.
 * Simulates a signed-in org admin so the real console shell (AppShell →
 * AppSidebar → SidebarAccountFooter / WorkspaceSwitcher) renders without a
 * live Clerk session. Only the members actually imported by app code are
 * implemented — extend this file if a component starts using a new Clerk API.
 */

const MOCK_USER = { fullName: "Priya Sharma", initials: "PS" };
const MOCK_ORG = {
  id: "org_2abcDEFghiJKLmno",
  name: "Acme Robotics",
  imageUrl: null as string | null,
};

export function useAuth() {
  return {
    isLoaded: true,
    isSignedIn: true,
    userId: "user_storybook",
    orgId: MOCK_ORG.id,
    has: () => true, // every role/permission check passes (org admin view)
  };
}

export function useClerk() {
  return {
    openOrganizationProfile: () => {},
    openUserProfile: () => {},
  };
}

export function useOrganization() {
  return { isLoaded: true, organization: MOCK_ORG };
}

export function useUser() {
  return { isLoaded: true, isSignedIn: true, user: { fullName: MOCK_USER.fullName } };
}

/** Static avatar + name, styled to sit where Clerk's UserButton does. */
export function UserButton({ showName = true }: { showName?: boolean } & Record<string, unknown>) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[0.8125rem] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent"
    >
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[0.6875rem] font-bold leading-none text-white">
        {MOCK_USER.initials}
      </span>
      {showName && (
        <span className="min-w-0 flex-1 truncate leading-none">{MOCK_USER.fullName}</span>
      )}
    </button>
  );
}

/** The mock session is always signed in. */
export function Show({ when, children }: { when: string; children: React.ReactNode }) {
  return when === "signed-in" ? <>{children}</> : null;
}

export function SignInButton({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SignUpButton({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function OrganizationSwitcher() {
  return null;
}

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
