import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { DocPackAssignments } from "@/components/doc-pack/doc-pack-assignments";
import { employeeHandlers } from "../../../.storybook/mocks/handlers";

const meta = {
  title: "Components/DocPack/DocPackAssignments",
  component: DocPackAssignments,
  args: { packId: "pack_a1b2c3d4e5f6g7h8i9", quizPublished: true },
} satisfies Meta<typeof DocPackAssignments>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uses the global happy-path MSW handlers (employees + existing assignments). */
export const WithAssignments: Story = {};

export const QuizNotPublished: Story = {
  args: { quizPublished: false },
};

export const NoAssignmentsYet: Story = {
  parameters: {
    msw: {
      handlers: [
        ...employeeHandlers,
        http.get("/api/doc-packs/:id/assignments", () => HttpResponse.json([])),
      ],
    },
  },
};
