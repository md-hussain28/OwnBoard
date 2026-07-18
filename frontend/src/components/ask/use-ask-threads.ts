"use client";

import type { UIMessage } from "ai";
import { useCallback, useEffect, useState } from "react";
import { ID_PREFIXES, typedId } from "@/lib";

/**
 * Client-side conversation history for "Ask project", persisted per-project in localStorage.
 * Each thread stores the full UIMessage list (parts + tool outputs) so a reopened conversation
 * re-renders its charts, citations, and components exactly as before.
 */
export type AskThread = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const MAX_THREADS = 50;
const storageKey = (projectId: string) => `ownboard:ask:${projectId}`;

function loadThreads(projectId: string): AskThread[] {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    const parsed = raw ? (JSON.parse(raw) as AskThread[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThreads(projectId: string, threads: AskThread[]) {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(threads.slice(0, MAX_THREADS)));
  } catch {
    // storage full / unavailable — history is best-effort
  }
}

function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const text = firstUser
    ? firstUser.parts.map((p) => (p.type === "text" ? p.text : "")).join("")
    : "";
  const trimmed = text.trim();
  return trimmed ? trimmed.slice(0, 60) : "New conversation";
}

export function useAskThreads(projectId: string) {
  const [threads, setThreads] = useState<AskThread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadThreads(projectId);
    setThreads(loaded);
    setActiveId(loaded.length ? loaded[0].id : typedId(ID_PREFIXES.message));
    setHydrated(true);
  }, [projectId]);

  const upsertActive = useCallback(
    (messages: UIMessage[]) => {
      if (!messages.length) return;
      setThreads((prev) => {
        const entry: AskThread = {
          id: activeId,
          title: deriveTitle(messages),
          messages,
          updatedAt: Date.now(),
        };
        const exists = prev.some((t) => t.id === activeId);
        const next = (
          exists ? prev.map((t) => (t.id === activeId ? entry : t)) : [entry, ...prev]
        ).sort((a, b) => b.updatedAt - a.updatedAt);
        saveThreads(projectId, next);
        return next;
      });
    },
    [activeId, projectId],
  );

  const newThread = useCallback(() => setActiveId(typedId(ID_PREFIXES.message)), []);
  const selectThread = useCallback((id: string) => setActiveId(id), []);
  const removeThread = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveThreads(projectId, next);
        return next;
      });
      setActiveId((current) => (current === id ? typedId(ID_PREFIXES.message) : current));
    },
    [projectId],
  );

  const activeThread = threads.find((t) => t.id === activeId) ?? null;
  return {
    threads,
    activeId,
    activeThread,
    hydrated,
    upsertActive,
    newThread,
    selectThread,
    removeThread,
  };
}
