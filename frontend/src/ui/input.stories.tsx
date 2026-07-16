import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "@/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { placeholder: "Repo URL" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true, placeholder: "Disabled" },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "not-a-url" },
};
