import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import {
  mockAssignmentDetail,
  mockAssignmentDocumentContent,
} from "../../../.storybook/mocks/data";
import { assignmentHandlers, loadingForever, quizHandlers } from "../../../.storybook/mocks/handlers";
import { AssignmentWorkspace } from "@/components/doc-pack/assignment-workspace";

const meta = {
  title: "Components/DocPack/AssignmentWorkspace",
  component: AssignmentWorkspace,
  args: { assignmentId: "asg_a1b2c3d4e5f6g7h8i9" },
} satisfies Meta<typeof AssignmentWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mid-read: one document acknowledged, quiz still locked (global handlers). */
export const Reading: Story = {};

/** Every document acknowledged — the quiz can be started. */
export const QuizUnlocked: Story = {
  parameters: {
    msw: {
      handlers: [
        ...assignmentHandlers.filter((h) => h.info.method !== "GET"),
        ...quizHandlers,
        http.get("/api/assignments/:id", () =>
          HttpResponse.json({
            ...mockAssignmentDetail,
            status: "ready_for_quiz",
            quiz_unlocked: true,
            documents: mockAssignmentDetail.documents.map((d) => ({
              ...d,
              acknowledged_at: d.acknowledged_at ?? "2026-07-08T09:00:00Z",
            })),
          }),
        ),
        http.get("/api/assignments/:id/documents/:documentId/content", () =>
          HttpResponse.json(mockAssignmentDocumentContent),
        ),
      ],
    },
  },
};

/** Already passed. */
export const Passed: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/assignments/:id", () =>
          HttpResponse.json({
            ...mockAssignmentDetail,
            status: "passed",
            quiz_unlocked: true,
            completed_at: "2026-07-09T10:30:00Z",
            documents: mockAssignmentDetail.documents.map((d) => ({
              ...d,
              acknowledged_at: d.acknowledged_at ?? "2026-07-08T09:00:00Z",
            })),
          }),
        ),
        http.get("/api/assignments/:id/documents/:documentId/content", () =>
          HttpResponse.json(mockAssignmentDocumentContent),
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [loadingForever("get", "/api/assignments/:id")] },
  },
};
