import type { Decorator } from "@storybook/nextjs-vite";
import { AppShell } from "@/components/layout";

/**
 * Wraps a screen story in the real console chrome — collapsible sidebar,
 * topbar with breadcrumbs, account footer. Works in Storybook because
 * `@clerk/nextjs` is aliased to a signed-in mock (`.storybook/mocks/clerk.tsx`).
 * Pair with `parameters: { layout: "fullscreen" }` and a
 * `nextjs.navigation.pathname` so the matching nav item highlights.
 */
export const withAppShell: Decorator = (Story) => (
  <AppShell>
    <Story />
  </AppShell>
);
