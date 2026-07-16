import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { loadingForever, notImplemented } from "../../../.storybook/mocks/handlers";
import { QuizAnalyticsCard } from "@/components/dashboard/quiz-analytics-card";

const meta = {
  title: "Components/Dashboard/QuizAnalyticsCard",
  component: QuizAnalyticsCard,
  args: { repoId: "repo_a1b2c3d4e5f6g7h8i9" },
} satisfies Meta<typeof QuizAnalyticsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uses the global happy-path MSW handlers. */
export const WithData: Story = {};

export const NoFailurePoints: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/dashboard/quiz-analytics", () =>
          HttpResponse.json({ passRate: 1, commonFailurePoints: [] }),
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [loadingForever("get", "/api/dashboard/quiz-analytics")] },
  },
};

/** Backend answered 501 — the domain service is still a stub. */
export const Incoming: Story = {
  parameters: {
    msw: { handlers: [notImplemented("get", "/api/dashboard/quiz-analytics")] },
  },
};
