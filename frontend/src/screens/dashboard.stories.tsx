import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import DashboardPage from "@/app/(console)/dashboard/page";
import { handlers, loadingForever, notImplemented } from "../../.storybook/mocks/handlers";
import { withAppShell } from "./story-shell";

/**
 * Skill-graph dashboard screen (`/dashboard`): bus-factor heatmap and quiz
 * analytics side by side, fed by the global MSW handlers. Rendered inside the
 * real console shell (sidebar + topbar).
 */
const meta = {
  title: "Screens/Dashboard",
  component: DashboardPage,
  decorators: [withAppShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/dashboard" } },
  },
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Happy path — both cards populated. */
export const Default: Story = {};

/** Both cards still loading. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        loadingForever("get", "/api/dashboard/bus-factor"),
        loadingForever("get", "/api/dashboard/quiz-analytics"),
        ...handlers,
      ],
    },
  },
};

/** The backend dashboard domain still answers 501 — both cards show "Incoming". */
export const Incoming: Story = {
  parameters: {
    msw: {
      handlers: [
        notImplemented("get", "/api/dashboard/bus-factor"),
        notImplemented("get", "/api/dashboard/quiz-analytics"),
        ...handlers,
      ],
    },
  },
};
