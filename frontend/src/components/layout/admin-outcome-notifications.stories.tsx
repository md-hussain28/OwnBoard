import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AdminOutcomeNotifications } from "@/components/layout/admin-outcome-notifications";
import { TooltipProvider } from "@/ui/tooltip";

const meta = {
  title: "Components/Layout/AdminOutcomeNotifications",
  component: AdminOutcomeNotifications,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex justify-end border border-border bg-background p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof AdminOutcomeNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /quiz result/i }));
  },
};
