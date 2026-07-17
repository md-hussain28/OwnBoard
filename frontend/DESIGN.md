---
name: OwnBoard
description: A cited, evidence-grounded onboarding console for new hires, mentors, and engineering managers.
colors:
  brand-honey: "oklch(0.68 0.155 72)"
  brand-amber: "oklch(0.55 0.145 55)"
  brand-teal: "oklch(0.55 0.105 195)"
  brand-coral: "oklch(0.62 0.175 28)"
  brand-moss: "oklch(0.58 0.115 155)"
  brand-info: "oklch(0.55 0.12 250)"
  brand-plum: "oklch(0.52 0.12 320)"
  brand-ink: "oklch(0.28 0.025 75)"
  brand-mist: "oklch(0.965 0.012 75)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.28 0.025 75)"
  primary: "oklch(0.68 0.155 72)"
  primary-foreground: "oklch(0.99 0.005 75)"
  accent: "oklch(0.94 0.03 195)"
  accent-foreground: "oklch(0.55 0.105 195)"
  success: "oklch(0.58 0.115 155)"
  warning: "oklch(0.55 0.145 55)"
  danger: "oklch(0.62 0.175 28)"
  info: "oklch(0.55 0.12 250)"
  sidebar: "oklch(0.22 0.03 75)"
  chart-1: "oklch(0.68 0.155 72)"
  chart-2: "oklch(0.55 0.105 195)"
  chart-3: "oklch(0.58 0.115 155)"
  chart-4: "oklch(0.62 0.175 28)"
  chart-5: "oklch(0.52 0.12 320)"
typography:
  display:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
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
  sm: "0.45rem"
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.125rem"
  2xl: "1.5rem"
  3xl: "1.875rem"
  4xl: "2.25rem"
---

# Design System: OwnBoard — Evidence Desk

## 1. Overview

**Creative North Star: "Evidence desk at golden hour"**

Pure white paper. Warm **Honey** for primary actions. Cool **Teal** for verified / cited. Distinct hues for status so risk never looks like success. No generic indigo SaaS purple.

**Strategy:** Full palette — multiple named brand roles, each with one job.

## 2. Brand primitives

| Token | Role | When to use |
|-------|------|-------------|
| `brand-honey` | Primary / CTA | Buttons, focus ring, active nav signal |
| `brand-amber` | Deep companion / warning | Gradients end, caution states |
| `brand-teal` | Verified / accent | Citations, “escalates to human”, secondary emphasis |
| `brand-coral` | Danger / bus-factor risk | Fail, destructive, high risk |
| `brand-moss` | Success / pass | Quiz pass, healthy coverage |
| `brand-info` | Informational | Neutral tips, docs links |
| `brand-plum` | Chart / variety | 5th series in dashboards |
| `brand-ink` | Text | Body and headings |
| `brand-mist` | Soft fill | Secondary surfaces, muted wells |

Soft companions (`*-soft`) exist for icon wells and pills: `bg-brand-honey-soft text-brand-honey`, etc.

## 3. Semantic mapping

- `primary` → honey  
- `accent` → teal soft fill + teal text  
- `success` → moss  
- `warning` → amber  
- `danger` / `destructive` → coral  
- `info` → info blue  
- Charts: honey → teal → moss → coral → plum  

## 4. Surfaces & elevation

- Canvas: pure white (`oklch(1 0 0)`). Warmth is in brand colors, not the page tint.
- Cards: white + honey-tinted `shadow-soft`.
- Sidebar: deep warm ink; honey for active.

### Dark mode (`.dark` in `globals.css`)

Not an inverted light theme. Comfort rules:

1. **Charcoal base** — ~`#121212` / `oklch(0.18 …)`, never pure black.
2. **Softened text** — primary ~87% white emphasis (`foreground` / `brand-ink`); secondary ~60% (`muted-foreground`); disabled/placeholders ~38% via opacity.
3. **Desaturated accents** — same brand hues, higher lightness and ~15–20% less chroma so they don’t vibrate.
4. **Luminance elevation** — lighter surfaces for higher layers (base → card → secondary → popover); shadows are hairline only.

## 5. Do's and Don'ts

### Do
- Use named `brand-*` tokens for intentional color moments.
- Keep one meaning per hue (coral = risk, moss = pass, teal = verified).
- Prefer soft fills + saturated text for badges.
- In dark mode, rely on surface lightness for depth — don’t pile on drop shadows.

### Don't
- Don't use raw Tailwind indigo/violet/purple for brand.
- Don't tint the whole page warm-cream — that fights the honey primary.
- Don't reuse honey for both success and warning.
- Don't use pure black backgrounds or pure white text in dark mode.
