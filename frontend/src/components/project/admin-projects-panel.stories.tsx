import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { AdminProjectsPanel } from "@/components/project/admin-projects-panel";
import { handlers, loadingForever } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/Project/AdminProjectsPanel",
  component: AdminProjectsPanel,
} satisfies Meta<typeof AdminProjectsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The admin projects grid, including an archived project behind the toggle (global handlers). */
export const Interactive: Story = {};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [loadingForever("get", "/api/projects"), ...handlers] },
  },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get("/api/projects", () => HttpResponse.json([])), ...handlers] },
  },
};
