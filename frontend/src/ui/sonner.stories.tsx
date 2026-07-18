"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { notify } from "@/lib";
import { Button } from "./button";
import { Toaster } from "./sonner";

const meta = {
  title: "UI/Toast",
  component: Toaster,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

function ToastDemo() {
  return (
    <div className="flex max-w-md flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => notify.success("Invitation sent", { description: "colleague@company.com" })}
      >
        Success
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.error("Could not save member", {
            description: "The backend is unreachable — please try again shortly.",
          })
        }
      >
        Error
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.warning("Tenant created", {
            description: "Invite failed: email address already invited.",
          })
        }
      >
        Warning
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.info("Upload started", {
            description: "Processing continues in the background.",
          })
        }
      >
        Info
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
            loading: "Generating quiz…",
            success: "Quiz generated",
            error: "Generation failed",
          })
        }
      >
        Promise
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.error(
            "A very long API message that should truncate cleanly once it exceeds the description budget so the toast stays readable and calm instead of dominating the viewport with dense error text from a verbose backend envelope.",
          )
        }
      >
        Long copy
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          notify.success("Event created", {
            action: {
              label: "Undo",
              onClick: () => notify.info("Undone"),
            },
          })
        }
      >
        With action
      </Button>
    </div>
  );
}

export const Types: Story = {
  render: () => <ToastDemo />,
};
