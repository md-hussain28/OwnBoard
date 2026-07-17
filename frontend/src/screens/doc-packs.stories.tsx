import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Suspense } from "react";
import DocPackDetailPage from "@/app/app/doc-packs/[id]/page";
import NewQuizPage from "@/app/app/doc-packs/new/page";
import DocPacksPage from "@/app/app/doc-packs/page";
import { handlers, loadingForever, notImplemented } from "../../.storybook/mocks/handlers";
import { withAppShell } from "./story-shell";

/**
 * Admin doc-pack screens: the quiz desk (`/app/doc-packs`), the create flow
 * (`/app/doc-packs/new`), and the pack builder (`/app/doc-packs/[id]`). Pages are the
 * real route components rendered inside the real console shell; data comes
 * from the global MSW handlers.
 */
const meta = {
  title: "Screens/DocPacks",
  decorators: [withAppShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/app/doc-packs" } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The quiz desk — pack list on the left, assignment overview on the right. */
export const QuizDesk: Story = {
  render: () => <DocPacksPage />,
};

/** Quiz desk with the assignment sheet open, driven by `?assign=` in the URL. */
export const QuizDeskAssignSheetOpen: Story = {
  render: () => <DocPacksPage />,
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/app/doc-packs",
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
  parameters: { nextjs: { navigation: { pathname: "/app/doc-packs/new" } } },
};

// `use(params)` suspends on first render, so the params promise must be stable
// across renders (module-level) and the page needs a Suspense boundary here.
const PACK_PARAMS = Promise.resolve({ id: "pack_a1b2c3d4e5f6g7h8i9" });

const PACK_BUILDER_NAV = {
  nextjs: { navigation: { pathname: "/app/doc-packs/pack_a1b2c3d4e5f6g7h8i9" } },
};

/** Pack builder — documents plus the generate/edit/publish quiz workflow. */
export const QuizBuilder: Story = {
  render: () => (
    <Suspense fallback={null}>
      <DocPackDetailPage params={PACK_PARAMS} />
    </Suspense>
  ),
  parameters: PACK_BUILDER_NAV,
};

/** Pack builder when the backend quiz domain still answers 501. */
export const QuizBuilderQuizIncoming: Story = {
  render: () => (
    <Suspense fallback={null}>
      <DocPackDetailPage params={PACK_PARAMS} />
    </Suspense>
  ),
  parameters: {
    ...PACK_BUILDER_NAV,
    msw: { handlers: [notImplemented("get", "/api/doc-packs/:id/quiz"), ...handlers] },
  },
};
