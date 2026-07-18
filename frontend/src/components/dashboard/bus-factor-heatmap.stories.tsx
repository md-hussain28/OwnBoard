import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { loadingForever, notImplemented } from "../../../.storybook/mocks/handlers";
import { BusFactorHeatmap } from "./bus-factor-heatmap";

const meta = {
  title: "Components/Dashboard/BusFactorHeatmap",
  component: BusFactorHeatmap,
  args: { repoId: "repo_a1b2c3d4e5f6g7h8i9" },
} satisfies Meta<typeof BusFactorHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Uses the global happy-path MSW handlers. */
export const WithData: Story = {};

export const Empty: Story = {
  parameters: {
    msw: { handlers: [http.get("/api/dashboard/bus-factor", () => HttpResponse.json([]))] },
  },
};

export const Loading: Story = {
  parameters: {
    msw: { handlers: [loadingForever("get", "/api/dashboard/bus-factor")] },
  },
};

/** Backend answered 501 — the domain service is still a stub. */
export const Incoming: Story = {
  parameters: {
    msw: { handlers: [notImplemented("get", "/api/dashboard/bus-factor")] },
  },
};

export const BackendError: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/dashboard/bus-factor", () =>
          HttpResponse.json({ detail: "boom" }, { status: 500 }),
        ),
      ],
    },
  },
};
