import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { loadingForever } from "../../../.storybook/mocks/handlers";
import { DocPackList } from "@/components/doc-pack/doc-pack-list";

const meta = {
  title: "Components/DocPack/DocPackList",
  component: DocPackList,
} satisfies Meta<typeof DocPackList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uses the global happy-path MSW handlers — creating a pack works too (mocked POST). */
export const WithPacks: Story = {};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get("/api/doc-packs", () => HttpResponse.json([]))] },
  },
};

export const Loading: Story = {
  parameters: { msw: { handlers: [loadingForever("get", "/api/doc-packs")] } },
};
