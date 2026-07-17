import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { DocPackQuizBuilder } from "@/components/doc-pack/doc-pack-quiz-builder";
import { mockAdminQuizTemplate } from "../../../.storybook/mocks/data";

const meta = {
  title: "Components/DocPack/DocPackQuizBuilder",
  component: DocPackQuizBuilder,
  args: { packId: "pack_a1b2c3d4e5f6g7h8i9", hasProcessedDocuments: true },
} satisfies Meta<typeof DocPackQuizBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An existing quiz loaded for curation (global happy-path handlers). */
export const WithExistingQuiz: Story = {};

/** 404 from GET /quiz means "no quiz generated yet" — shows the generate form. */
export const NoQuizYet: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/doc-packs/:id/quiz", () =>
          HttpResponse.json({ detail: "Not found" }, { status: 404 }),
        ),
        http.post("/api/doc-packs/:id/generate-quiz", () =>
          HttpResponse.json({
            template: mockAdminQuizTemplate,
            rejected_slots: [
              {
                document_title: "Vendor Review Checklist",
                citation: "§2.1",
                reason: "Passage too short to ground a question",
              },
            ],
            needs_review: true,
          }),
        ),
      ],
    },
  },
};

/** Documents still processing — generation is blocked. */
export const NoProcessedDocuments: Story = {
  args: { hasProcessedDocuments: false },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/doc-packs/:id/quiz", () =>
          HttpResponse.json({ detail: "Not found" }, { status: 404 }),
        ),
      ],
    },
  },
};
