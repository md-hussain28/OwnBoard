import { create } from "zustand";

export type OnboardingStep = "policy-quiz" | "codebase-quiz" | "unlocked";

export type StepResult = "pending" | "passed" | "failed";

interface OnboardingState {
  currentStep: OnboardingStep;
  policyQuizResult: StepResult;
  codebaseQuizResult: StepResult;
  setStep: (step: OnboardingStep) => void;
  setPolicyQuizResult: (result: StepResult) => void;
  setCodebaseQuizResult: (result: StepResult) => void;
  reset: () => void;
}

const initialState = {
  currentStep: "policy-quiz" as OnboardingStep,
  policyQuizResult: "pending" as StepResult,
  codebaseQuizResult: "pending" as StepResult,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setStep: (step) => set({ currentStep: step }),
  setPolicyQuizResult: (result) => set({ policyQuizResult: result }),
  setCodebaseQuizResult: (result) => set({ codebaseQuizResult: result }),
  reset: () => set(initialState),
}));
