import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExpertIntroCard } from "./expert-intro-card";

const meta = {
  title: "Components/Chat/ExpertIntroCard",
  component: ExpertIntroCard,
} satisfies Meta<typeof ExpertIntroCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    routing: {
      contributorName: "Priya Sharma",
      evidence: "Authored 84% of commits touching services/auth/ over the last 12 months.",
      draftMessage:
        "Hi Priya! I'm onboarding and trying to understand how session revocation works in the auth service. The assistant pointed me to you as the expert here — do you have 15 minutes this week?",
    },
  },
};
