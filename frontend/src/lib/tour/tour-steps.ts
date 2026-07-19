import {
  BellIcon,
  BookOpenCheckIcon,
  ClipboardCheckIcon,
  FolderKanbanIcon,
  GitBranchIcon,
  HandIcon,
  HomeIcon,
  LayoutGridIcon,
  ListChecksIcon,
  type LucideIcon,
  PartyPopperIcon,
  ScrollTextIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { APP_HOME, appPath } from "@/lib";
import type { AppRole } from "@/schemas";

/**
 * A single stop in the guided product tour.
 *
 * The tour is an interactive spotlight walkthrough (see `product-tour.tsx`): each
 * stop navigates to the real page, cuts a highlight around the actual UI element,
 * and points a card at it. Cards are written like the person who built OwnBoard is
 * walking a new user through it — plain language, what the feature is *for*, a few
 * concrete highlights, and one "here's how you actually use it" nudge.
 *
 * Users don't have to walk it in order: the launcher (`tour-trigger.tsx`) lists
 * every stop so they can jump straight to any feature and have it explained.
 */
export type TourFeature = {
  /** Stable id (React keys / analytics / deep-linking from the launcher). */
  id: string;
  icon: LucideIcon;
  /**
   * Icon-well color classes (soft fill + saturated text). Kept as a full literal
   * so Tailwind can see the class names statically — don't build these dynamically.
   */
  iconWell: string;
  /** Feature name — the card headline and the launcher row title. */
  title: string;
  /** One-line hook under the title. */
  tagline: string;
  /** 1–2 sentences on what it is and why it matters. Friendly, not technical. */
  body: string;
  /**
   * A few scannable "what you can do here" bullets. Optional. These are what make
   * a stop feel detailed — each one is a concrete capability, not marketing fluff.
   */
  highlights?: string[];
  /** One concrete "here's how you actually use it" nudge. Optional (intro/finish skip it). */
  howTo?: string;
  /**
   * Console route to navigate to when this stop shows, so the user sees the real
   * page while it's being explained. Omit to stay on the current page.
   */
  route?: string;
  /**
   * CSS selector for the real UI element to spotlight (matches a persistent
   * `data-tour="…"` anchor in the shell). When present and on-screen, the tour
   * cuts a highlight around it and points the card at it. Omit for intro/summary
   * cards, which show centered.
   */
  anchor?: string;
  /**
   * A project sub-section key (`members`, `onboarding`, `docs`, `repositories`,
   * `ask` — see `nav-config.ts`). When set, the tour resolves the route and anchor
   * against a *live* project at runtime: it opens the viewer's first project at this
   * section and spotlights the section's real on-page content (`[data-tour=
   * "project-panel-<key>"]`, added to each section view). If the viewer has no
   * project yet it gracefully falls back to `route` (the projects list), centered.
   */
  projectSection?: string;
  /**
   * OwnBoard `app_role` gate. Omit = shown to everyone. When set, only those roles
   * see the stop (so admins and members get a tour tailored to what they can do).
   */
  roles?: AppRole[];
};

export const TOUR_FEATURES: TourFeature[] = [
  {
    id: "welcome",
    icon: HandIcon,
    iconWell: "bg-brand-honey-soft text-brand-honey",
    title: "Welcome to OwnBoard 👋",
    tagline: "Onboarding you can actually trust",
    body: "Instead of ticking “I read it” boxes, people here prove they've learned — with quizzes built from your own policies and your real git history, plus AI that answers from your team's actual docs and code. This quick walkthrough opens each page as it explains it, so you're seeing the real thing. Take the full tour, or jump straight to any feature from the launcher.",
    route: APP_HOME,
  },
  {
    id: "workspace",
    icon: LayoutGridIcon,
    iconWell: "bg-brand-plum-soft text-brand-plum",
    title: "Your workspace",
    tagline: "Everything is scoped to your company",
    body: "This is your organization. All of your policies, projects, and people live inside it, kept separate from every other company on OwnBoard. The name and logo up here confirm exactly which workspace you're looking at.",
    highlights: [
      "Belong to more than one company? Switch between them right here.",
      "Everything you see — docs, quizzes, skill maps — is private to this workspace.",
    ],
    howTo:
      "Click the workspace name in the top-left to switch organizations or manage its settings.",
    route: APP_HOME,
    anchor: '[data-tour="workspace"]',
  },
  {
    id: "home",
    icon: HomeIcon,
    iconWell: "bg-brand-honey-soft text-brand-honey",
    title: "Home",
    tagline: "Your daily starting point",
    body: "Home is the fastest read on where things stand. Managers see who's on track, who's fallen behind, and where knowledge is at risk. New hires see one clear thing: their next step.",
    highlights: [
      "A one-glance summary of what needs your attention today.",
      "Managers: who's on track, who's behind, and where knowledge is thin.",
      "New hires: your next action, front and centre.",
    ],
    howTo: "Open Home each morning — it's the one-glance summary of what needs your attention.",
    route: APP_HOME,
    anchor: '[data-tour="nav-home"]',
  },
  {
    id: "onboarding",
    icon: BookOpenCheckIcon,
    iconWell: "bg-brand-amber-soft text-brand-amber",
    title: "Onboarding tracks",
    tagline: "Build learning that's verified, not self-reported",
    body: "This is where you create onboarding. Add your policy docs and OwnBoard turns them into quizzes — plus codebase quizzes generated from real commit history, so you know people genuinely learned it.",
    highlights: [
      "Drop in policy docs → OwnBoard drafts the quiz for you.",
      "Codebase quizzes are built from actual git history, not guesswork.",
      "Target each track at everyone or specific domains — with a live preview of exactly who it reaches.",
      "The Insights view tracks the whole cohort: who passed, who's behind, who hasn't started.",
    ],
    howTo:
      "Create a track, drop in the docs, pick its audience — then watch progress roll in under Insights.",
    route: appPath("tracks"),
    anchor: '[data-tour="nav-onboarding"]',
    roles: ["admin"],
  },
  {
    id: "modules",
    icon: ClipboardCheckIcon,
    iconWell: "bg-brand-amber-soft text-brand-amber",
    title: "My modules",
    tagline: "Everything assigned to you, in one place",
    body: "Your onboarding lives here. Read the material, pass the quiz, and the next step unlocks — your progress saves automatically, so you can always pick up where you left off.",
    highlights: [
      "Read the material, then prove it with a short quiz.",
      "Passing a quiz unlocks the next step automatically.",
      "Your progress is saved as you go — leave and come back anytime.",
    ],
    howTo: "Work through them top to bottom — passing the quiz is what marks a step complete.",
    route: appPath("onboarding", "packs"),
    anchor: '[data-tour="nav-modules"]',
    roles: ["member"],
  },
  {
    id: "projects",
    icon: FolderKanbanIcon,
    iconWell: "bg-brand-teal-soft text-brand-teal",
    title: "Projects",
    tagline: "Where a team, its work, and its knowledge come together",
    body: "A project is a real team's home base — its people, its docs, and its code in one place. From actual contributions it builds a live skill map and flags “bus-factor” risk when critical knowledge sits with just one person. Open one and it fans out into a set of tabs in the sidebar — we'll walk each of them next.",
    highlights: [
      "People, documents, and repositories for a team, all in one place.",
      "A skill map built from real contributions — not self-rated stars.",
      "Bus-factor alerts when only one person holds critical knowledge.",
    ],
    howTo:
      "Open any project from this list — its Members, Project Onboarding, Docs, Repos, and Ask project tabs appear right here in the sidebar.",
    route: appPath("projects"),
    anchor: '[data-tour="nav-projects"]',
  },
  {
    id: "project-members",
    icon: UsersIcon,
    iconWell: "bg-brand-teal-soft text-brand-teal",
    title: "Members",
    tagline: "Who's on the team — and what they actually know",
    body: "The roster for this project. See everyone on it, their role, and where each person is in their onboarding — then click any member to open their full profile, including skills inferred from their real commits, not self-rated stars.",
    highlights: [
      "Every member, with their live onboarding progress.",
      "Click a member for their full profile — commit-derived skills included.",
      "Add teammates or promote a team lead in a couple of clicks.",
    ],
    howTo:
      "Open Members to add people, set a lead, and click through to anyone's evidence-backed profile.",
    projectSection: "members",
    route: appPath("projects"),
    roles: ["admin"],
  },
  {
    id: "project-modules",
    icon: ListChecksIcon,
    iconWell: "bg-brand-amber-soft text-brand-amber",
    title: "Project Onboarding",
    tagline: "The onboarding path built for this project",
    body: "The learning made specifically for this team — policy and codebase modules tied to this project's own docs and repos. Members work through them step by step, and every step is proven with a quiz, not a checkbox.",
    highlights: [
      "Modules scoped to this project's real docs and code.",
      "Each step is verified with a quiz before it counts as done.",
      "Flexible audience: the whole team, specific domains, or hand-picked people.",
    ],
    howTo:
      "Open Project Onboarding to shape the path; members then complete it from their own “My modules”.",
    projectSection: "onboarding",
    route: appPath("projects"),
  },
  {
    id: "project-docs",
    icon: ScrollTextIcon,
    iconWell: "bg-brand-plum-soft text-brand-plum",
    title: "Docs",
    tagline: "The source of truth this project is built on",
    body: "Every document that matters to this project — architecture notes, runbooks, policies — kept in one place. These same docs are what OwnBoard turns into quizzes and what it cites when someone asks a question.",
    highlights: [
      "Upload and organise the docs that define this project.",
      "The same docs feed onboarding quizzes automatically.",
      "They ground Ask, so every answer points back to a real source.",
    ],
    howTo:
      "Open Docs to upload files and tag them — onboarding and Ask both build on what lives here.",
    projectSection: "docs",
    route: appPath("projects"),
  },
  {
    id: "project-repos",
    icon: GitBranchIcon,
    iconWell: "bg-brand-teal-soft text-brand-teal",
    title: "Repos",
    tagline: "The code behind the project — connected, not guessed at",
    body: "Link the repositories this project ships, and OwnBoard reads their git history to build the skill map, write codebase quizzes grounded in real commits, and answer questions about how the code actually works.",
    highlights: [
      "Connect the repositories this team owns.",
      "Real commit history powers skill maps and codebase quizzes.",
      "Sync status shows exactly what's connected and up to date.",
    ],
    howTo:
      "Open Repos to connect a repository — the git-history features light up once it's synced.",
    projectSection: "repositories",
    route: appPath("projects"),
    roles: ["admin"],
  },
  {
    id: "project-ask",
    icon: SparklesIcon,
    iconWell: "bg-brand-teal-soft text-brand-teal",
    title: "Ask project",
    tagline: "Not just a chat box — a rich, interactive answer",
    body: "Ask anything about this project in plain English, and OwnBoard answers with more than a wall of text. Depending on your question, it builds the right thing to show it: interactive charts, tickable checklists, flashcards, quizzes, timelines, side-by-side comparisons, code snippets, and more — every answer cited to the exact doc or commit, and escalated to a real expert when the context runs thin.",
    highlights: [
      "Interactive charts — bar, line, area, pie/donut and radar — drawn from real project data.",
      "Learn-by-doing blocks: checklists you can tick off, flashcards to flip, and quick quizzes to test yourself.",
      "Structured answers: ramp-up timelines, comparison tables, file-tree maps, runnable command blocks and code snippets.",
      "Who-to-ask cards surface the right expert, and every claim links back to its source doc or commit.",
      "Save and revisit whole conversations from History, or start a fresh thread anytime.",
    ],
    howTo:
      "Open Ask project and try a starter prompt like “Give me a first-week ramp-up plan” or “Quiz me on this project” — watch it render a real checklist, chart, or quiz, not just text.",
    projectSection: "ask",
    route: appPath("projects"),
  },
  {
    id: "assistant",
    icon: SparklesIcon,
    iconWell: "bg-brand-honey-soft text-brand-honey",
    title: "AI Assistant",
    tagline: "Your onboarding co-pilot — it answers and it acts",
    body: "Pinned at the bottom of the sidebar, always a click away. This is an agent with hands: it reads your org's live onboarding data to answer questions, and it can carry out real admin work for you — no forms, no clicking around.",
    highlights: [
      "Ask for analytics — pass/fail breakdowns, who hasn't started, what's overdue, project-by-project comparisons — answered with interactive charts and tables.",
      "Tell it to act: add someone to a project, create a new hire, assign an onboarding track — it performs the real operation, then shows you the result.",
      "Built on the same rich answer stack as Ask project, so replies come back as metrics, charts, and callouts — not walls of text.",
    ],
    howTo:
      "Try “Who hasn't started their onboarding yet?” — then let it fix what it finds: “Assign them the security track.”",
    route: appPath("assistant"),
    anchor: '[data-tour="nav-assistant"]',
    roles: ["admin"],
  },
  {
    id: "notifications",
    icon: BellIcon,
    iconWell: "bg-brand-info-soft text-brand-info",
    title: "Notifications",
    tagline: "Nothing slips through the cracks",
    body: "New assignments, quiz results, and overdue reminders show up here in real time, so you're never left guessing what changed.",
    highlights: [
      "New assignments and due-date reminders land here.",
      "Quiz results and escalations, the moment they happen.",
    ],
    howTo: "Click the bell in the top bar whenever it lights up.",
    anchor: '[data-tour="notifications"]',
  },
  {
    id: "finish",
    icon: PartyPopperIcon,
    iconWell: "bg-brand-moss-soft text-brand-moss",
    title: "You're all set 🎉",
    tagline: "Go ahead and dive in",
    body: "That's the whole tour. Everything OwnBoard tells you is backed by evidence — and you can replay this walkthrough, or jump to any single feature, anytime from the “Take a tour” launcher in the corner.",
  },
];

/** The stops this viewer should see, in order (role-gated features filtered out). */
export function tourFeaturesForRole(role: AppRole | null | undefined): TourFeature[] {
  return TOUR_FEATURES.filter((f) => {
    if (!f.roles || f.roles.length === 0) return true;
    if (!role) return false;
    return f.roles.includes(role);
  });
}
