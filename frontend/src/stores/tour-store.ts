import { create } from "zustand";

/**
 * Drives the product tour (Driver.js) from anywhere in the console.
 *
 * The tour itself lives in `components/tour/product-tour.tsx`, mounted once in the
 * app shell. Any component (e.g. the topbar "Take a tour" button) calls `start()`;
 * bumping `runNonce` is what the ProductTour effect watches to (re)launch — a nonce
 * rather than a boolean so replaying while a tour is already open still re-triggers.
 */
interface TourState {
  runNonce: number;
  /** Launch / relaunch the guided tour. */
  start: () => void;
}

export const useTourStore = create<TourState>((set) => ({
  runNonce: 0,
  start: () => set((s) => ({ runNonce: s.runNonce + 1 })),
}));
