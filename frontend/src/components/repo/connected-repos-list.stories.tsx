import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { loadingForever, repoHandlers } from "../../../.storybook/mocks/handlers";
import { ConnectedReposList } from "./connected-repos-list";

const meta = {
  title: "Components/Repo/ConnectedReposList",
  component: ConnectedReposList,
} satisfies Meta<typeof ConnectedReposList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uses the global happy-path MSW handlers — adding a repo works too (mocked POST). */
export const WithRepos: Story = {
  parameters: { msw: { handlers: repoHandlers } },
};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get("/api/repos", () => HttpResponse.json([]))] },
  },
};

export const Loading: Story = {
  parameters: { msw: { handlers: [loadingForever("get", "/api/repos")] } },
};

/** What users see when FastAPI is down (the proxy answers 503). */
export const BackendDown: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/repos", () =>
          HttpResponse.json({ detail: "Backend unreachable" }, { status: 503 }),
        ),
      ],
    },
  },
};
