import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QuizQuestionCard } from "@/components/onboarding/quiz-question-card";

const meta = {
  title: "Components/Onboarding/QuizQuestionCard",
  component: QuizQuestionCard,
} satisfies Meta<typeof QuizQuestionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Uncontrolled: clicking an option selects it (the component's demo-friendly fallback).
export const Interactive: Story = {
  args: {
    questionText: "Within how many minutes must a SEV-1 page reach the on-call engineer?",
    options: ["5 minutes", "15 minutes", "30 minutes", "60 minutes"],
    sourceCitation: "Incident Response Runbook, §1",
  },
};

export const TrueFalse: Story = {
  args: {
    questionText: "A blameless postmortem is due within 5 business days of a SEV-1.",
    options: ["True", "False"],
    sourceCitation: "Incident Response Runbook, §4",
  },
};

export const ControlledSelected: Story = {
  args: {
    questionText: "Which service owns webhook retries?",
    options: ["notifications", "billing", "auth", "ingestion"],
    selected: "notifications",
  },
};

export const WithoutCitation: Story = {
  args: {
    questionText: "Which branch do release tags cut from?",
    options: ["main", "develop", "release/*", "trunk"],
    sourceCitation: null,
  },
};
