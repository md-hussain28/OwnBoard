import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "@/ui/badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Badge" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "success", "warning", "outline", "ghost", "link"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="ghost">Ghost</Badge>
    </div>
  ),
};

export const StatusExamples: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Ingested</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="warning">Low confidence</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge variant="outline">Incoming</Badge>
    </div>
  ),
};
