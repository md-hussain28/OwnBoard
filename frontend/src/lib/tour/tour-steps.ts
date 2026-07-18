import type { DriveStep } from "driver.js";

/**
 * Guided product tour steps for the console.
 *
 * Every step is anchored to a persistent shell element (`[data-tour="…"]`) so the
 * tour runs from any `/app/**` route without navigating. Steps with no `element`
 * are centered modals (welcome / finish).
 *
 * This is a *superset*: admins and members see different sidebar items, so
 * ProductTour filters out any step whose target isn't currently in the DOM
 * (see `product-tour.tsx`). That also gracefully skips off-canvas items on mobile.
 */
export const TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "Welcome to OwnBoard 👋",
      description:
        "Onboarding you can actually verify — policy & codebase quizzes grounded in your real git history, a live skill graph with bus-factor alerts, and citation-backed answers. Take 30 seconds and we'll show you around.",
    },
  },
  {
    element: '[data-tour="workspace"]',
    popover: {
      title: "Your workspace",
      description:
        "This is your active organization. Everything — policies, projects, quizzes, and people — is scoped to the workspace shown here.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-home"]',
    popover: {
      title: "Home base",
      description:
        "Your personalized overview. Managers see what's at risk and who's behind; new hires see their single next step.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-onboarding"]',
    popover: {
      title: "Onboarding tracks",
      description:
        "Build onboarding tracks with policy quizzes and codebase quizzes generated from real commit history — learning is verified, not a self-reported checkbox.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-modules"]',
    popover: {
      title: "Your modules",
      description:
        "Your assigned onboarding lives here: read the docs, pass the quiz, unlock the next step. Progress is tracked automatically.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="nav-projects"]',
    popover: {
      title: "Projects",
      description:
        "Each project bundles its team, docs, and repos with a real skill graph (who actually knows what, plus bus-factor alerts) and an Ask panel for cited, grounded answers.",
      side: "right",
      align: "start",
    },
  },
  {
    element: '[data-tour="notifications"]',
    popover: {
      title: "Stay in the loop",
      description:
        "Assignments, quiz results, and overdue reminders land here in real time — no inbox digging.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: '[data-tour="sidebar-toggle"]',
    popover: {
      title: "More room to work",
      description: "Collapse the sidebar anytime to give the content full focus.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="tour-trigger"]',
    popover: {
      title: "Replay anytime",
      description: "Lost? Re-open this guided tour whenever you like from right here.",
      side: "bottom",
      align: "end",
    },
  },
  {
    popover: {
      title: "You're all set 🎉",
      description:
        "Every answer OwnBoard gives is grounded in citations, and low-confidence questions escalate to a human instead of guessing. Dive in — and remember you can replay this tour anytime.",
    },
  },
];
