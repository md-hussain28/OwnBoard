---
name: OwnBoard
description: A cited, evidence-grounded onboarding console for new hires, mentors, and engineering managers.
colors:
  background: "oklch(0.985 0.006 220)"
  foreground: "oklch(0.22 0.028 255)"
  card: "oklch(0.995 0.003 220)"
  primary: "oklch(0.48 0.11 195)"
  primary-foreground: "oklch(0.99 0.01 195)"
  secondary: "oklch(0.955 0.01 220)"
  secondary-foreground: "oklch(0.28 0.03 255)"
  muted: "oklch(0.955 0.01 220)"
  muted-foreground: "oklch(0.48 0.025 250)"
  accent: "oklch(0.94 0.02 195)"
  border: "oklch(0.9 0.012 220)"
  ring: "oklch(0.55 0.1 195)"
  destructive: "oklch(0.55 0.22 25)"
  success: "oklch(0.55 0.13 155)"
  warning: "oklch(0.72 0.14 75)"
  danger: "oklch(0.55 0.22 25)"
  sidebar: "oklch(0.2 0.03 255)"
  sidebar-primary: "oklch(0.72 0.12 195)"
  chart-1: "oklch(0.55 0.12 195)"
  chart-2: "oklch(0.58 0.1 230)"
  chart-3: "oklch(0.55 0.13 155)"
  chart-4: "oklch(0.7 0.12 75)"
  chart-5: "oklch(0.5 0.04 255)"
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

**Creative North Star: "Ink & Signal"**

OwnBoard is where a new hire's understanding of a codebase gets checked against reality. The interface is a modern console: cool-tinted surfaces, a committed dark sidebar rail, and a single teal **signal** for primary actions and the current nav selection. Color is spent on wayfinding and status — never decoration. Light and dark themes are first-class equals.

This system rejects generic purple-glow SaaS, cream/sand paper backgrounds, gamified onboarding theatrics, and dense enterprise chrome. Calm, precise, modern.

**Key Characteristics:**
- Cool-tinted neutrals (hue ~220/255) + teal primary (hue ~195).
- Dark sidebar rail in light mode; deeper rail in dark mode.
- Flat elevation — structure from borders and tone shifts; optional light backdrop-blur on sticky chrome only.
- Geist Sans for UI; Geist Mono for evidence (commits, paths, citations).
- Theme toggle + org + user live in the **sidebar footer**.

## 2. Colors

### Primary (Signal Teal)
- Light: `oklch(0.48 0.11 195)` — primary buttons, focus rings, key links.
- Dark: `oklch(0.72 0.12 195)` — same role, lifted for contrast on dark surfaces.
- Sidebar active / mark: `sidebar-primary` (bright teal on the rail).

### Surfaces
- **Canvas** (`background`): cool off-white / deep slate — never pure gray, never cream.
- **Card / popover**: slightly lifted from canvas.
- **Muted / secondary**: cool wash for hover fills and skeletons.
- **Sidebar**: committed dark rail (`oklch(0.2 0.03 255)` light theme; darker in `.dark`).

### Status (semantic only)
- **success** / **warning** / **danger** (+ `destructive`) — risk, pass/fail, errors. Never raw Tailwind palette colors for severity.

### Named Rules
**The Signal Rule.** Teal (`primary` / `sidebar-primary`) is the only non-status accent with visual weight. Use it for primary actions, focus, and current selection.

**The Status-Token-Only Rule.** Severity and pass/fail go through `success` / `warning` / `danger` only.

**The Dual-Theme Rule.** Every token has a paired `.dark` value. Prefer `next-themes` class strategy (`class="dark"` on `<html>`). Default theme: light; persist user choice.

## 3. Typography

Same roles as before: Display → Headline → Title → Body → Label → Mono. One sans family (Geist); mono reserved for evidence.

## 4. Elevation

Prefer `border` / `ring-1` over shadows. Sticky top chrome may use `backdrop-blur` + translucent background. Do not pair wide soft drop shadows with 1px borders on cards.

## 5. Components

### Navigation (console)
- Collapsible left sidebar + slim top bar (trigger + context only).
- **Sidebar footer:** theme toggle → org switcher → user button.
- Active nav: `sidebar-accent` fill + `sidebar-primary` text/icon.
- Stub domains keep the outline **Incoming** badge.

### Buttons / inputs / badges
- Primary = teal fill; outline/ghost = neutrals; destructive = tinted red fill.
- Focus: `ring-3 ring-ring/50` + border shift.
- Transitions: ~150ms ease-out; honor `prefers-reduced-motion`.

### Loading / Error / Empty
Unchanged three-state pattern: Skeleton → muted error line → "No X yet."

## 6. Do's and Don'ts

### Do
- Ship light and dark with matching semantics.
- Keep org/account/theme in the sidebar footer on console surfaces.
- Use teal only for signal (action / selection / focus).
- Render provenance in Geist Mono.

### Don't
- Don't reintroduce pure grayscale or cream paper as the brand.
- Don't put org/user chrome back in the top bar on console pages.
- Don't use purple gradients, glow stacks, or gamified mascots.
- Don't use raw Tailwind status colors instead of tokens.
