import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatMessage } from "./chat-message";

const meta = {
  title: "Components/Chat/ChatMessage",
  component: ChatMessage,
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
  args: {
    message: {
      id: "msg_1",
      role: "user",
      content: "Who owns webhook retries, and why was the retry queue added?",
    },
  },
};

export const AssistantWithCitation: Story = {
  args: {
    message: {
      id: "msg_2",
      role: "assistant",
      content:
        "Webhook retries are handled by the notifications service — the retry queue was introduced to stop duplicate deliveries after the 2025 incident.",
      sourceCitation: {
        commitSha: "d34eaacbb1f2",
        filePath: "services/notifications/retry_queue.py",
        summary: "Introduce idempotent webhook retry queue",
      },
      confidence: "high",
    },
  },
};

export const AssistantLowConfidence: Story = {
  args: {
    message: {
      id: "msg_3",
      role: "assistant",
      content:
        "I couldn't find a well-grounded answer for this in the commit history, so I'm routing you to an expert instead of guessing.",
      confidence: "low",
    },
  },
};

export const Conversation: Story = {
  args: { message: { id: "msg_0", role: "user", content: "" } },
  render: () => (
    <div className="max-w-2xl space-y-4">
      <ChatMessage
        message={{ id: "m1", role: "user", content: "How does repo ingestion dedupe commits?" }}
      />
      <ChatMessage
        message={{
          id: "m2",
          role: "assistant",
          content:
            "Ingestion keys each commit by SHA and skips ones already stored, so re-ingesting a repo is idempotent.",
          sourceCitation: { filePath: "backend/app/services/ingest.py" },
          confidence: "high",
        }}
      />
    </div>
  ),
};
