import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { ProjectMemberPanel } from "@/components/project/project-member-panel";
import { handlers, loadingForever } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/Project/ProjectMemberPanel",
  component: ProjectMemberPanel,
  args: { projectId: "proj_a1b2c3d4e5f6g7h8i9" },
  parameters: { msw: { handlers } },
} satisfies Meta<typeof ProjectMemberPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Read-only member panel — a go-to person plus an in-progress member (global handlers). */
export const Interactive: Story = {};

/** Admin variant with per-row remove controls. */
export const Manageable: Story = {
  args: { manageable: true },
};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [loadingForever("get", "/api/projects/:id/members"), ...handlers] },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [http.get("/api/projects/:id/members", () => HttpResponse.json([])), ...handlers],
    },
  },
};
