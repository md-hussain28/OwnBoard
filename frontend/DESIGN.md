---
name: OwnBoard
description: A cited, evidence-grounded onboarding console for new hires, mentors, and engineering managers.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  border: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  success: "oklch(0.6 0.14 155)"
  warning: "oklch(0.7 0.16 70)"
  danger: "oklch(0.577 0.245 27.325)"
  chart-1: "oklch(0.87 0 0)"
  chart-2: "oklch(0.556 0 0)"
  chart-3: "oklch(0.439 0 0)"
  chart-4: "oklch(0.371 0 0)"
  chart-5: "oklch(0.269 0 0)"
typography:
  display:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  3xl: "1.375rem"
  4xl: "1.625rem"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 0.625rem"
    height: "2rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "2rem"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "0.125rem 0.5rem"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "0.125rem 0.5rem"
  badge-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "0.125rem 0.5rem"
---

# Design System: OwnBoard

## 1. Overview

**Creative North Star: "The Evidence Ledger"**

OwnBoard is where a new hire's understanding of a codebase gets checked against reality, not against vibes. The interface reads like a well-kept ledger: quiet, exact, every entry traceable to a source. It is achromatic by default — near-black ink on paper-white, one hairline gray for structure — because the product's whole premise is that trust comes from citations and commit history, not from visual enthusiasm. Color is spent only where it carries meaning: a status (pass/fail, risk level, confidence), never as decoration.

This system explicitly rejects the generic gradient-SaaS register (no gradient-text hero, no tiny uppercase eyebrows, no identical icon-card grids, no marketing scaffolding on what is an internal workflow tool), rejects gamified onboarding (no confetti, badges-as-rewards, or playful progress theatrics — this gates real repo access, it isn't a game), and rejects dense enterprise-dashboard chrome (no cramped Jira/Salesforce-style tables). The existing grayscale, generous-whitespace direction is correct; the job is to formalize it, not replace it.

**Key Characteristics:**
- Achromatic surface (grayscale OKLCH) with color reserved strictly for semantic status.
- Flat elevation — structure comes from a 1px ring/border, never a shadow.
- One typeface (Geist Sans) carries every UI role; Geist Mono is reserved for anything that is *evidence* — commit hashes, file paths, citations.
- Calm, direct copy. No exclamation points, no "Woo!", no cutesy empty states.

## 2. Colors

The palette is almost entirely grayscale OKLCH; color exists only to mean something.

### Primary
- **Graphite** (`oklch(0.205 0 0)`, token `primary`): the one "loud" color in the system — near-black, used for primary buttons, the wordmark, and the current-selection state. Never used decoratively.

### Neutral
- **Paper White** (`oklch(1 0 0)`, token `background`/`card`): the base surface for the whole app — no tint, no warmth.
- **Ink** (`oklch(0.145 0 0)`, token `foreground`): primary text color. Contrast against Paper White is ~17.9:1 — comfortably clears the 4.5:1 AA floor with room to spare.
- **Pale Gray** (`oklch(0.97 0 0)`, tokens `secondary`/`muted`/`accent`): the second neutral layer — card footers, skeleton loaders, hover backgrounds, the muted badge.
- **Slate Gray** (`oklch(0.556 0 0)`, token `muted-foreground`): secondary/caption text — descriptions, empty-state copy, timestamps. Contrast against Paper White is ~4.6:1 — right at the AA floor; never darken the background under this text without re-checking contrast.
- **Hairline Gray** (`oklch(0.922 0 0)`, tokens `border`/`input`): the only border color in the system. One weight, one color, everywhere.

### Status (the semantic vocabulary — use these, never raw Tailwind palette colors)
- **Verified Green** (`oklch(0.6 0.14 155)`, token `success`): low bus-factor risk, quiz pass, "ingested" state.
- **Caution Amber** (`oklch(0.7 0.16 70)`, token `warning`): medium risk, low-confidence answers escalating to a human, "needs review."
- **Alert Red** (`oklch(0.577 0.245 27.325)`, tokens `danger` / `destructive`): high bus-factor risk, quiz fail, destructive actions. `destructive` and `danger` share one value by design — one hue for "something is wrong," whether that's a form error or a risk rating.

### Named Rules
**The One Loud Color Rule.** `primary` (near-black) is the only non-status color allowed to carry visual weight. Everything else is Paper White, Pale Gray, or a border hairline. If a screen needs a second "loud" color that isn't `success`/`warning`/`danger`, that's a sign the layout needs rethinking, not a new token.

**The Status-Token-Only Rule.** Severity, risk level, and pass/fail state are expressed exclusively through `success`/`warning`/`danger` (and their `-foreground` pairs). Reaching for `bg-emerald-500`, `text-amber-600`, `border-red-500`, or any other raw Tailwind palette color for a status meaning is prohibited — it silently breaks dark mode and desyncs from the one place severity is actually defined.

## 3. Typography

**Body Font:** Geist Sans (with `ui-sans-serif, system-ui, sans-serif` fallback)
**Label/Mono Font:** Geist Mono (with `ui-monospace, monospace` fallback)

**Character:** One typeface family carries the entire interface — headings, buttons, labels, body. This is deliberate: a product-register tool doesn't need a display/body pairing, and a second typeface would read as decoration the product's personality explicitly avoids. Geist Mono is the one typographic accent, reserved for *evidence* (commit SHAs, file paths, cited sources) so provenance is visually distinct from prose at a glance.

### Hierarchy
- **Display** (600, 1.875rem/30px, line-height 1.2): the app wordmark and the home page's single hero heading only. Nothing else uses this size.
- **Headline** (600, 1.5rem/24px, line-height 1.25): page-level titles — "Dashboard," "Archaeology Q&A," each onboarding step's heading.
- **Title** (500, 1rem/16px, line-height 1.375): component-level headers — card titles, section headers inside a page.
- **Body** (400, 0.875rem/14px, line-height 1.5): the default for everything — paragraphs, list items, form labels, card descriptions. Cap prose at 65–75ch.
- **Label** (500, 0.75rem/12px, line-height 1, uppercase not required): captions, muted meta text ("Evidence," "Drafted intro message"), timestamps, badge text.
- **Mono** (400, 0.8125rem/13px, line-height 1.5): commit hashes, file paths, citation snippets, code excerpts inside chat/archaeology answers.

### Named Rules
**The One Family Rule.** Every UI role — display down to label — is Geist Sans at a different size/weight step. Do not introduce a second sans-serif for "variety." Product UI earns trust through consistency, not typographic novelty (per PRODUCT.md: "calm density over decoration").

**The Evidence-Is-Mono Rule.** Anything that is cited provenance — a commit hash, a file path, a quoted code line — renders in Geist Mono, never Geist Sans. This is the one place the system deliberately breaks its own "one family" rule, and it does so consistently: mono means "this is where the claim came from."

## 4. Elevation

OwnBoard is flat by default. There is no `box-shadow` anywhere in the current component set — depth and separation come entirely from a 1px ring/border and background-tone shifts (a card's footer sits on `bg-muted/50` rather than a darker shadow band). This matches the product register directly: shadows read as decoration in a tool whose whole value proposition is "we don't perform confidence we don't have."

### Named Rules
**The No-Shadow Rule.** Surfaces separate from their background via `ring-1 ring-foreground/10` (cards) or a single `border` (header, inputs, list rows) — never `box-shadow`. If a component needs to feel "lifted," reach for a tone shift (a slightly different background) before reaching for a shadow.

## 5. Components

Every interactive component ships all of: default, hover, focus-visible, active, disabled. Loading is a skeleton, never a spinner over content. This project uses shadcn/ui primitives (`radix-nova` style, `neutral` base) living in `src/ui/` — extend variants there, don't fork a one-off styled element in a feature component.

### Buttons
- **Shape:** rounded corners at the `md`→`lg` step (10px, `rounded-lg`), scaling down slightly for `xs`/`sm` sizes.
- **Primary:** `bg-primary` (Graphite) / `text-primary-foreground`, hover fades to 80% opacity (`hover:bg-primary/80`) — no color hue-shift on hover, only opacity.
- **Outline / Secondary / Ghost:** all resolve to a neutral (`background`/`secondary`/transparent) surface with a hover step to `bg-muted` — used for any action that isn't the page's single primary action.
- **Destructive:** `bg-destructive/10` / `text-destructive` at rest (a tinted fill, not a solid red button) — reserved for irreversible actions (delete, revoke access), distinct from the `danger` status token used for risk/severity display.
- **Focus:** every variant gets `ring-3 ring-ring/50` plus a `border-ring` shift on `focus-visible` — never remove the focus ring.

### Chips / Badges
- **Style:** small pill (`rounded-4xl`, ~26px tall), tinted 10% background + full-strength text color of its semantic token — this is the status vocabulary described in §2. `success`/`warning`/`danger` variants exist on the `Badge` primitive (`src/ui/badge.tsx`) precisely so status never needs a raw Tailwind color again.
- **Use:** risk level, quiz pass/fail, "ingested"/"pending" repo state, "low confidence" routing flags.

### Cards / Containers
- **Corner Style:** `rounded-xl` (14px).
- **Background:** `bg-card` (Paper White), no gradient, no tint.
- **Shadow Strategy:** none — see §4. Separation via `ring-1 ring-foreground/10`.
- **Border:** none by default; the ring substitutes for a border. A card can take a semantic border (`border-warning/40`) when the *card itself* represents a status, e.g. a low-confidence expert-routing card.
- **Internal Padding:** the `--card-spacing` custom property, default `1rem` (`spacing.md`), `0.75rem` (`spacing.sm`) for the compact `size="sm"` variant.

### Inputs / Fields
- **Style:** `border-input` (Hairline Gray), transparent background, `rounded-lg`, height `2rem` — matches button height so forms line up.
- **Focus:** `border-ring` + `ring-3 ring-ring/50`, same treatment as buttons for consistency.
- **Error:** `aria-invalid` drives `border-destructive` + `ring-destructive/20` — wire this up via the field's `aria-invalid` prop, don't hand-roll a red border.
- **Disabled:** reduced opacity + `bg-input/50`, pointer-events removed.

### Navigation
- A single top header (`border-b`, no shadow) with the wordmark at Display-adjacent weight (`text-lg font-semibold`) and inline text links at Body size in `muted-foreground`, shifting to `foreground` on hover/active. No sidebar, no breadcrumbs — the product's surface area doesn't need them yet. Introduce a sidebar only if the dashboard's information density genuinely requires it, not by default.

### Loading / Error / Empty (signature pattern)
Every data-driven component in this codebase follows the same three-state pattern — treat it as load-bearing, not incidental:
- **Loading:** `<Skeleton>` (`bg-muted`, `animate-pulse`) shaped like the eventual content. Never a spinner.
- **Error:** a single `text-sm text-muted-foreground` line stating plainly what's unavailable and why (e.g. "Bus-factor analytics aren't available yet."). No red text, no alarm — the backend simply isn't ready yet, and the copy should say so calmly.
- **Empty:** a single `text-sm text-muted-foreground` line in the form "No `<X>` yet." — matter-of-fact, not encouraging or cute.

## 6. Do's and Don'ts

### Do:
- **Do** use `success` / `warning` / `danger` tokens for every status/severity meaning — risk level, pass/fail, confidence. One token, one meaning, everywhere it appears (PRODUCT.md: "one state, one meaning").
- **Do** keep the interface achromatic outside of status color and the single `primary` graphite. Restraint is the brand.
- **Do** render provenance (commit hashes, file paths, cited snippets) in Geist Mono so evidence is visually distinct from prose.
- **Do** ship the full state set (default/hover/focus-visible/active/disabled, plus loading/error/empty for data views) on every interactive or data-bound component.
- **Do** write calm, direct copy for errors and empty states — state what's missing, not "Oops!" or "Nothing to see here 👀".
- **Do** keep separation flat: `ring-1 ring-foreground/10` or a single `border`, never a `box-shadow`.

### Don't:
- **Don't** use raw Tailwind palette colors (`bg-emerald-500`, `text-amber-600`, `border-red-500`, etc.) for status or severity — always go through `success`/`warning`/`danger`.
- **Don't** add a gradient-text hero, tiny uppercase tracked eyebrows, or identical icon-card grids — this is an internal workflow tool, not a marketing landing page (PRODUCT.md anti-reference: "generic gradient SaaS").
- **Don't** add confetti, badges-as-rewards, mascots, or playful progress theatrics to the onboarding flow — it gates real repo access, it isn't a game (PRODUCT.md anti-reference: "gamified onboarding").
- **Don't** build cramped, table-dense enterprise chrome — keep the current generous-whitespace, grayscale direction (PRODUCT.md anti-reference: "dense enterprise dashboard").
- **Don't** introduce a second sans-serif, or use a display/heading typeface for body copy, labels, or data — one family, sized and weighted differently, is the whole system.
- **Don't** reach for a modal as the first solution — exhaust inline/progressive alternatives first; modals are usually laziness in a product-register UI.
- **Don't** build a component that only has a default state — every interactive element needs hover, focus-visible, active, and disabled treatments before it ships.
