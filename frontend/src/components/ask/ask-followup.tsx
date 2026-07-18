"use client";

import { createContext, useContext } from "react";

type AskFollowupValue = {
  /** Ask a follow-up question in the current thread. No-op while the assistant is busy. */
  ask: (prompt: string) => void;
  /** Whether a turn is in flight — lets action chips disable themselves. */
  busy: boolean;
};

const AskFollowupContext = createContext<AskFollowupValue | null>(null);

/** `showActions` chips call `useAskFollowup().ask(prompt)` to send a follow-up into the chat. */
export function useAskFollowup(): AskFollowupValue {
  return useContext(AskFollowupContext) ?? { ask: () => {}, busy: false };
}

export function AskFollowupProvider({
  value,
  children,
}: {
  value: AskFollowupValue;
  children: React.ReactNode;
}) {
  return <AskFollowupContext.Provider value={value}>{children}</AskFollowupContext.Provider>;
}
