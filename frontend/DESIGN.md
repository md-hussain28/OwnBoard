---
name: OwnBoard
description: A cited, evidence-grounded onboarding console for new hires, mentors, and engineering managers.
colors:
  brilliance: "#fdfcfc"
  violet-essence: "#e6e4e6"
  no-way-rose: "#f9b095"
  palladium: "#b1b1b1"
  precious-persimmon: "#f87941"
  night-black: "#2f3035"
  background: "#fdfcfc"
  foreground: "#2f3035"
  card: "#ffffff"
  primary: "#f87941"
  primary-foreground: "#2f3035"
  secondary: "#e6e4e6"
  secondary-foreground: "#2f3035"
  muted: "#e6e4e6"
  muted-foreground: "#5a5b61"
  accent: "oklch(0.94 0.04 41)"
  border: "#d4d2d4"
  ring: "#f87941"
  destructive: "oklch(0.55 0.2 25)"
  success: "oklch(0.52 0.12 155)"
  warning: "#f87941"
  danger: "oklch(0.55 0.2 25)"
  sidebar: "#2f3035"
  sidebar-primary: "#f87941"
  chart-1: "#f87941"
  chart-2: "#f9b095"
  chart-3: "oklch(0.52 0.12 155)"
  chart-4: "#b1b1b1"
  chart-5: "#2f3035"
  dark-background: "#1c1d21"
  dark-card: "#2f3035"
  dark-muted-foreground: "#b1b1b1"
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

**Creative North Star: "Night & Ember"**

OwnBoard is where a new hire's understanding of a codebase gets checked against reality. The interface is a modern console: Brilliance canvas, a Night Black sidebar rail, and a single **Precious Persimmon** signal for primary actions and the current nav selection. Color is spent on wayfinding and status — never decoration. Light and dark themes are first-class equals.

This system rejects generic purple-glow SaaS, teal-by-default tech chrome, gamified onboarding theatrics, and dense enterprise layouts. Calm, precise, warm-signal.

**Key Characteristics:**
- Six brand primitives → semantic tokens (never hardcode hex in components).
- Night Black rail + Persimmon signal; Rosé only as a soft wash / chart secondary.
- Flat elevation — structure from borders and tone shifts; optional light backdrop-blur on sticky chrome only.
- Geist Sans for UI; Geist Mono for evidence (commits, paths, citations).
- Theme toggle + org + user live in the **sidebar footer**.

## 2. Colors

### Brand primitives

| Name | Hex | Role |
|------|-----|------|
| Brilliance | `#fdfcfc` | Light canvas |
| Violet Essence | `#e6e4e6` | Muted / secondary fills |
| No Way Rosé | `#f9b095` | Soft accent (charts, dark accent text) |
| Palladium | `#b1b1b1` | Borders (via soft mix); dark muted text |
| Precious Persimmon | `#f87941` | Primary signal |
| Night Black | `#2f3035` | Ink, sidebar, text on Persimmon |

Derived (same ink family as Night Black): **Graphite** `#5a5b61` (light muted text), **Canvas Deep** `#1c1d21` (dark background).

### Primary (Persimmon)
- Both themes: `#f87941` with **Night Black** foreground — white-on-Persimmon fails contrast (~2.6:1); Night-on-Persimmon passes (~4.9:1).
- Focus rings and sidebar active mark use the same Persimmon.

### Surfaces
- **Light:** Brilliance canvas → white cards → Violet Essence muted fills → soft Palladium-adjacent borders.
- **Dark:** Canvas Deep (`#1c1d21`) → Night Black cards → raised muted (`~#3a3b41`) → Palladium muted text. Depth from surface lightness, not shadows.
- **Sidebar:** Night Black in light; deeper charcoal in dark. Active = Persimmon.

### Status (semantic only)
- **success** / **danger** / **destructive** — dedicated tokens. **warning** reuses Persimmon (brand-aligned caution). Never raw Tailwind palette colors for severity.

### Named Rules
**The Ember Rule.** Persimmon (`primary` / `sidebar-primary`) is the only non-status accent with visual weight. Use it for primary actions, focus, and current selection.

**The Ink-on-Ember Rule.** Never put white text on Persimmon. Always Night Black (or `primary-foreground`).

**The Status-Token-Only Rule.** Severity and pass/fail go through `success` / `warning` / `danger` only.

**The Dual-Theme Rule.** Every semantic token has a paired `.dark` value. Prefer `next-themes` class strategy (`class="dark"` on `<html>`). Default theme: light; persist user choice.

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
- Primary = Persimmon fill + Night Black text; outline/ghost = neutrals; destructive = tinted red fill.
- Focus: `ring-3 ring-ring/50` + border shift.
- Transitions: ~150ms ease-out; honor `prefers-reduced-motion`.

### Loading / Error / Empty
Unchanged three-state pattern: Skeleton → muted error line → "No X yet."

## 6. Do's and Don'ts

### Do
- Ship light and dark with matching semantics.
- Keep org/account/theme in the sidebar footer on console surfaces.
- Use Persimmon only for signal (action / selection / focus).
- Render provenance in Geist Mono.
- Reference brand primitives (`--precious-persimmon`, etc.) when extending the palette.

### Don't
- Don't put white text on Persimmon.
- Don't put org/user chrome back in the top bar on console pages.
- Don't use purple gradients, glow stacks, teal defaults, or gamified mascots.
- Don't use raw Tailwind status colors instead of tokens.
- Don't use Palladium as body/muted text on Brilliance (fails contrast) — use Graphite.
