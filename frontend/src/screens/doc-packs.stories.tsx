import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocPackDetailView } from "@/app/app/tracks/[id]/view";
import NewQuizPage from "@/app/app/tracks/new/page";
import DocPacksPage from "@/app/app/tracks/page";
import { handlers, loadingForever, notImplemented } from "../../.storybook/mocks/handlers";
import { withAppShell } from "./story-shell";

/**
 * Admin doc-pack screens: the quiz desk (`/app/tracks`), the create flow
 * (`/app/tracks/new`), and the pack builder (`/app/tracks/[id]`). Pages are the
 * real route components rendered inside the real console shell; data comes
 * from the global MSW handlers.
 */
const meta = {
  title: "Screens/DocPacks",
  decorators: [withAppShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/app/tracks" } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The quiz desk — pack list on the left, assignment overview on the right. */
export const QuizDesk: Story = {
  render: () => <DocPacksPage />,
};

/** Quiz desk with the assign modal open, driven by `?assign=` in the URL. */
export const QuizDeskAssignSheetOpen: Story = {
  render: () => <DocPacksPage />,
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/app/tracks",
        query: { assign: "pack_a1b2c3d4e5f6g7h8i9" },
      },
    },
  },
};

/** Quiz desk while packs are still loading. */
export const QuizDeskLoading: Story = {
  render: () => <DocPacksPage />,
  parameters: {
    // Story handlers replace the globals, so re-spread them after the override
    // (MSW matches first-wins).
    msw: { handlers: [loadingForever("get", "/api/doc-packs"), ...handlers] },
  },
};

/** Create flow — step 1 of Details → Documents → Quiz. */
export const CreateQuiz: Story = {
  render: () => <NewQuizPage />,
  parameters: { nextjs: { navigation: { pathname: "/app/tracks/new" } } },
};

const PACK_ID = "pack_a1b2c3d4e5f6g7h8i9";

const PACK_BUILDER_NAV = {
  nextjs: { navigation: { pathname: `/app/tracks/${PACK_ID}` } },
};

/** Pack builder — documents plus the generate/edit/publish quiz workflow. */
export const QuizBuilder: Story = {
  render: () => <DocPackDetailView id={PACK_ID} />,
  parameters: PACK_BUILDER_NAV,
};

/** Pack builder when the backend quiz domain still answers 501. */
export const QuizBuilderQuizIncoming: Story = {
  render: () => <DocPackDetailView id={PACK_ID} />,
  parameters: {
    ...PACK_BUILDER_NAV,
    msw: { handlers: [notImplemented("get", "/api/doc-packs/:id/quiz"), ...handlers] },
  },
};
