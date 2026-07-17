import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";
import { AssignmentNotifications } from "@/components/layout/assignment-notifications";
import { TooltipProvider } from "@/ui/tooltip";

const meta = {
  title: "Components/Layout/AssignmentNotifications",
  component: AssignmentNotifications,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex justify-end border border-border bg-background p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof AssignmentNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /quiz assignment/i }));
  },
};
