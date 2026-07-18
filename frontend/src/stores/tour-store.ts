import { create } from "zustand";

/**
 * Drives the guided product tour and its launcher from anywhere in the console.
 *
 * The launcher (`components/tour/tour-trigger.tsx`) is a floating button that
 * expands into a menu of every tour stop; the tour itself (`product-tour.tsx`) is
 * the spotlight walkthrough. Both are mounted once in the app shell and share this
 * store so they can hand off to each other:
 *
 * - `openMenu` / `closeMenu` / `toggleMenu` control the launcher panel. The running
 *   tour calls `openMenu()` ("All steps") to hand control back to the menu.
 * - `start(featureId?)` launches the walkthrough, optionally jumping straight to one
 *   stop. It bumps `runNonce` (a nonce, not a boolean, so replaying while a tour is
 *   already open still re-triggers) and closes the menu.
 */
interface TourState {
  runNonce: number;
  /** Feature id to open on; null starts at the beginning (the welcome card). */
  startId: string | null;
  /** Whether the launcher's feature menu is expanded. */
  menuOpen: boolean;
  /** Launch / relaunch the guided tour, optionally jumping to a specific feature. */
  start: (featureId?: string) => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  runNonce: 0,
  startId: null,
  menuOpen: false,
  start: (featureId) =>
    set((s) => ({ runNonce: s.runNonce + 1, startId: featureId ?? null, menuOpen: false })),
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
}));
