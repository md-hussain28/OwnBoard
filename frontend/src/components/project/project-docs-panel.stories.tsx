import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HttpResponse, http } from "msw";
import { handlers } from "../../../.storybook/mocks/handlers";
import { ProjectDocsPanel } from "./project-docs-panel";

const PROJECT_ID = "proj_a1b2c3d4e5f6g7h8i9";

const repos = [
  {
    repoId: "repo_11111111111111111111",
    name: "payments-api",
    url: "https://github.com/acme/payments-api",
    isPrimary: true,
    assignees: [],
  },
  {
    repoId: "repo_22222222222222222222",
    name: "checkout-web",
    url: "https://github.com/acme/checkout-web",
    isPrimary: false,
    assignees: [],
  },
];

/** Wire-format payload for GET /projects/:id/docs (snake_case — the zod schema transforms it). */
const docsPayload = {
  pack_id: "pack_00000000000000000000",
  types: [
    { id: "dtype_1", name: "PRD", sort_order: 0 },
    { id: "dtype_2", name: "KT notes", sort_order: 1 },
    { id: "dtype_3", name: "System design", sort_order: 2 },
  ],
  documents: [
    {
      id: "doc_1",
      title: "Payments Service PRD",
      description: "Q3 payments design — idempotency keys, retry policy, ledger schema.",
      file_type: "pdf",
      status: "processed",
      page_count: 24,
      error_message: null,
      created_at: "2026-07-01T10:00:00Z",
      type_ids: ["dtype_1"],
      type_names: ["PRD"],
      repo_ids: ["repo_11111111111111111111"],
      repos: [
        {
          repo_id: "repo_11111111111111111111",
          name: "payments-api",
          url: "https://github.com/acme/payments-api",
        },
      ],
    },
    {
      id: "doc_2",
      title: "Checkout KT session notes",
      description: null,
      file_type: "pdf",
      status: "processing",
      page_count: null,
      error_message: null,
      created_at: "2026-07-18T09:30:00Z",
      type_ids: ["dtype_2"],
      type_names: ["KT notes"],
      repo_ids: [],
      repos: [],
    },
    {
      id: "doc_3",
      title: "Code setup",
      description: null,
      file_type: "pdf",
      status: "failed",
      page_count: null,
      error_message: "PDF contained no extractable text",
      created_at: "2026-07-19T14:00:00Z",
      type_ids: [],
      type_names: [],
      repo_ids: [],
      repos: [],
    },
  ],
};

const docsHandlers = [
  http.get("/api/projects/:id/docs", () => HttpResponse.json(docsPayload)),
  http.patch("/api/projects/:id/docs/:documentId", () => HttpResponse.json(docsPayload)),
  http.post("/api/projects/:id/doc-types", () =>
    HttpResponse.json({ id: "dtype_new", name: "Runbook", sort_order: 3 }, { status: 201 }),
  ),
  ...handlers,
];

const meta = {
  title: "Components/Project/ProjectDocsPanel",
  component: ProjectDocsPanel,
  args: { projectId: PROJECT_ID, manageable: true, repos },
  parameters: { msw: { handlers: docsHandlers } },
} satisfies Meta<typeof ProjectDocsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Admin view — ready/processing/failed rows, filters, upload + per-row edit via the `⋯` menu. */
export const Manageable: Story = {};

/** Member view — read-only list, no upload button or row actions. */
export const ReadOnly: Story = {
  args: { manageable: false },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("/api/projects/:id/docs", () =>
          HttpResponse.json({ ...docsPayload, documents: [] }),
        ),
        ...docsHandlers,
      ],
    },
  },
};
