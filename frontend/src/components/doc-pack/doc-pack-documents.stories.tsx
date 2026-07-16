import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { docPackDocumentListSchema } from "@/schemas/docPack.schema";
import { mockDocuments } from "../../../.storybook/mocks/data";
import { DocPackDocuments } from "@/components/doc-pack/doc-pack-documents";

// Parse the wire-format mocks through the real zod schema so the story
// receives exactly what the service layer would produce.
const documents = docPackDocumentListSchema.parse(mockDocuments);

const meta = {
  title: "Components/DocPack/DocPackDocuments",
  component: DocPackDocuments,
  args: { packId: "pack_a1b2c3d4e5f6g7h8i9", packName: "HR Policy" },
} satisfies Meta<typeof DocPackDocuments>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mixed statuses: processed, processing, and failed (with error message). */
export const MixedStatuses: Story = {
  args: { documents },
};

export const AllProcessed: Story = {
  args: { documents: documents.map((d) => ({ ...d, status: "processed" as const, errorMessage: null })) },
};

export const Empty: Story = {
  args: { documents: [] },
};
