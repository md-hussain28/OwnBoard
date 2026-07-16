import { Suspense } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import OnboardingPage from "@/app/(console)/onboarding/page";
import PolicyQuizPage from "@/app/(console)/onboarding/policy-quiz/page";
import CodebaseQuizPage from "@/app/(console)/onboarding/codebase-quiz/page";
import UnlockedPage from "@/app/(console)/onboarding/unlocked/page";
import EmployeePacksPage from "@/app/(console)/onboarding/packs/page";
import AssignmentPage from "@/app/(console)/onboarding/packs/[assignmentId]/page";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { withAppShell } from "./story-shell";

/**
 * Full onboarding flow, screen by screen: hub → policy quiz → codebase quiz →
 * unlocked, plus the assigned-reading track (pack list → assignment workspace).
 * Pages are the real `app/(console)/onboarding/**` route components rendered
 * inside the real console shell; data comes from the global MSW handlers.
 */
const meta = {
  title: "Screens/Onboarding",
  decorators: [withAppShell],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/onboarding" } },
  },
  // The onboarding store is module-global zustand state — reset it before every
  // story so progress made in one story (or via the Continue buttons) never
  // leaks into the next.
  loaders: [
    () => {
      useOnboardingStore.getState().reset();
    },
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 0 — the hub, nothing completed yet. */
export const Hub: Story = {
  render: () => <OnboardingPage />,
};

/** Hub after passing the policy quiz — codebase quiz is the current step. */
export const HubPolicyPassed: Story = {
  render: () => <OnboardingPage />,
  loaders: [
    () => {
      useOnboardingStore.setState({
        currentStep: "codebase-quiz",
        policyQuizResult: "passed",
        codebaseQuizResult: "pending",
      });
    },
  ],
};

/** Hub with the whole flow completed. */
export const HubCompleted: Story = {
  render: () => <OnboardingPage />,
  loaders: [
    () => {
      useOnboardingStore.setState({
        currentStep: "unlocked",
        policyQuizResult: "passed",
        codebaseQuizResult: "passed",
      });
    },
  ],
};

/** Step 1 — scenario question cited to the policy source. */
export const PolicyQuiz: Story = {
  render: () => <PolicyQuizPage />,
  parameters: { nextjs: { navigation: { pathname: "/onboarding/policy-quiz" } } },
};

/** Step 2 — question grounded in git history. */
export const CodebaseQuiz: Story = {
  render: () => <CodebaseQuizPage />,
  parameters: { nextjs: { navigation: { pathname: "/onboarding/codebase-quiz" } } },
};

/** Step 3 — repo access granted. */
export const Unlocked: Story = {
  render: () => <UnlockedPage />,
  parameters: { nextjs: { navigation: { pathname: "/onboarding/unlocked" } } },
};

/** Assigned reading list — pick a pack, see read/quiz status per assignment. */
export const AssignedReading: Story = {
  render: () => <EmployeePacksPage />,
  parameters: { nextjs: { navigation: { pathname: "/onboarding/packs" } } },
};

// `use(params)` suspends on first render, so the params promise must be stable
// across renders (module-level) and the page needs a Suspense boundary here.
const ASSIGNMENT_PARAMS = Promise.resolve({ assignmentId: "asg_a1b2c3d4e5f6g7h8i9" });

/** Assignment workspace — read & acknowledge documents, then take the quiz. */
export const AssignmentWorkspace: Story = {
  render: () => (
    <Suspense fallback={null}>
      <AssignmentPage params={ASSIGNMENT_PARAMS} />
    </Suspense>
  ),
  parameters: {
    nextjs: { navigation: { pathname: "/onboarding/packs/asg_a1b2c3d4e5f6g7h8i9" } },
  },
};
