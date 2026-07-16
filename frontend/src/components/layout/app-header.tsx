"use client";

import Link from "next/link";
import { OrganizationSwitcher, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/ui/button";
import { usePlatformAdminMe } from "@/hooks/queries/admin/admin.queries";

const NAV_LINKS = [
  { href: "/onboarding", label: "Onboarding" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Dashboard" },
];

/** Hide Clerk's built-in "Create organization" affordances — tenants are provisioned via /admin. */
const hideCreateOrganizationAppearance = {
  elements: {
    organizationSwitcherPopoverActionButton__createOrganization: {
      display: "none",
    },
    organizationListCreateOrganizationActionButton: {
      display: "none",
    },
  },
} as const;

export function AppHeader() {
  const { data: adminMe } = usePlatformAdminMe();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Onboard
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-6 text-sm text-muted-foreground">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          {adminMe?.isPlatformAdmin && (
            <Link href="/admin" className="hover:text-foreground">
              Superadmin
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <OrganizationSwitcher
                hidePersonal
                afterSelectOrganizationUrl="/"
                appearance={hideCreateOrganizationAppearance}
              />
              <UserButton />
            </Show>
          </div>
        </nav>
      </div>
    </header>
  );
}
