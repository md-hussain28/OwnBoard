import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { MyProjectsPanel } from "@/components/project/my-projects-panel";
import { mockMyProjects } from "../../../.storybook/mocks/data";
import { handlers } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/Project/MyProjectsPanel",
  component: MyProjectsPanel,
} satisfies Meta<typeof MyProjectsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A mix of a locked (in-progress) and a ready (unlocked) project (global handlers). */
export const Interactive: Story = {};

export const Locked: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/projects/mine", () => HttpResponse.json([mockMyProjects[0]])),
        ...handlers,
      ],
    },
  },
};

export const Ready: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/projects/mine", () => HttpResponse.json([mockMyProjects[1]])),
        ...handlers,
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get("/api/projects/mine", () => HttpResponse.json([])), ...handlers] },
  },
};
