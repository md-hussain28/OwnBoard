import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IncomingBadge, IncomingFeature } from "@/components/layout/incoming-feature";

const meta = {
  title: "Components/Layout/IncomingFeature",
  component: IncomingFeature,
} satisfies Meta<typeof IncomingFeature>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    description: "Bus-factor analysis is grounded in real git history — it's still being built.",
  },
};

export const BadgeOnly: Story = {
  args: { description: "" },
  render: () => <IncomingBadge />,
};
