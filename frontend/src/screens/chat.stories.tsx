import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, HttpResponse, http } from "msw";
import { userEvent, within } from "storybook/test";
import ChatPage from "@/app/(console)/chat/page";
import { mockChatResponse, mockExpertRouting } from "../../.storybook/mocks/data";
import { handlers, notImplemented } from "../../.storybook/mocks/handlers";
import { withAppShell } from "./story-shell";

/**
 * Archaeology Q&A screen (`/chat`), inside the real console shell. The flow
 * stories use a play function to type a question and submit it, so the full
 * ask → cited answer (or expert escalation) exchange is visible without
 * clicking around.
 */
const meta = {
  title: "Screens/Chat",
  component: ChatPage,
  decorators: [withAppShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/chat" } },
  },
} satisfies Meta<typeof ChatPage>;

export default meta;
type Story = StoryObj<typeof meta>;

async function askQuestion(canvasElement: HTMLElement, question: string) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByPlaceholderText("Why is this retry loop here?"), question);
  await userEvent.click(canvas.getByRole("button", { name: "Ask" }));
  return canvas;
}

/** Fresh screen — just the assistant's welcome message. */
export const Empty: Story = {};

/** Flow: ask a question, get a commit-cited answer (global mock, ~600ms latency). */
export const CitedAnswer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await askQuestion(canvasElement, "Why does the webhook retry queue exist?");
    await canvas.findByText(/2025 incident/, undefined, { timeout: 4000 });
  },
};

/** Flow: low-confidence answer escalates to a human with a drafted intro. */
export const ExpertEscalation: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("/api/chat", async () => {
          await delay(600);
          return HttpResponse.json({
            message: {
              ...mockChatResponse.message,
              content:
                "I couldn't find a confident answer in the commit history for how session revocation works.",
              sourceCitation: null,
              confidence: "low",
            },
            expertRouting: mockExpertRouting,
          });
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await askQuestion(canvasElement, "How does session revocation work?");
    await canvas.findByText(mockExpertRouting.contributorName, undefined, { timeout: 4000 });
  },
};

/** Flow: the backend chat domain still answers 501 — graceful "being built" copy. */
export const Incoming: Story = {
  parameters: {
    msw: { handlers: [notImplemented("post", "/api/chat"), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = await askQuestion(canvasElement, "Why is this retry loop here?");
    await canvas.findByText(/still being built/, undefined, { timeout: 4000 });
  },
};
