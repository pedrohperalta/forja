# Web Admin Foundation Redesign — UI/UX changes & remaining work

Branch: `track/web-admin-foundation`. Full plan:
`docs/superpowers/plans/2026-06-23-web-admin-foundation-redesign.md`.

## Goal

Foundation redesign of the Next.js web admin (`web/`) responding to "the UI/UX is
horrible / too compressed". The brand is kept (lime `#c2f000`, Bebas Neue display,
Syne UI, pill buttons, dark industrial); the work is *execution* — design tokens,
interaction states, affordance, layout, breathing room, and the login.

All changes are in `web/src/app/globals.css`, `web/src/components/admin/AdminUi.tsx`,
and the `web/src/app/admin/**` screens. Web gate green throughout (typecheck + lint
+ 102 tests).

## UI/UX changes (done)

### Design language / tokens
- Added **space / type / radius / shadow / motion** scales as CSS custom properties in `:root`. Previously only colors + one radius existed; ~30 ad-hoc font sizes / dozens of spacing values / 6 radii had no scale. Everything below now consumes these tokens.

### Buttons & controls
- **Size scale** `sm` (36px) / `md` (44px) / `lg` (56px). Default dropped from 56→44px (the "botões enormes" complaint). `lg` reserved for a single hero CTA.
- Added **`:hover` / `:active` / `:focus-visible`** with token-based transitions (the UI was completely static / no keyboard focus before).

### Affordance — pills vs. tags
- Codified rule: **pill shape = interactive only**. Static metadata now uses a new **`AdminTag`** primitive (square `--radius-sm`, low emphasis, leading dot, no pointer).
- Reclassified all the metadata that *looked like buttons but wasn't* (build rows, publication meta, import exercise meta, login). Removed the conflicting descendant pill CSS that outranked `.admin-tag` on specificity.

### Shell / layout
- **`AdminFrame` rewritten.** Was a centered ~64rem column with a top pill-nav — read as a "scaled-up mobile app". Now a **CSS-grid shell: left sidebar on desktop, fixed bottom-nav ≤860px**, a wider **78rem** canvas, and `aria-current` on the active link. Nav links gained hover/focus.

### Hierarchy & color
- **Accent discipline.** Lime gradients were on every card/strip, so nothing stood out. Neutralized the redundant surfaces (metric strips, plan cards); lime is now reserved for stat numbers + the single focal "Próxima ação" panel per screen.
- **Contrast.** Dim (#444) meta labels → muted (#888) for WCAG AA.

### Density
- **Breathing-room pass** (the "comprimido" feedback): generous card padding, airier section rhythm, a wider dashboard column. Tool-screen hero title dropped 4.8→2.75rem (tool altitude, not a landing hero).

### Login (entry point)
- **Full redesign into an immersive entrance**: layered lime gradient mesh + a balanced **two-glow breathing aurora** + subtle **concentric energy rings** + **film grain**; a glassy card with an **animated accent bar**; a condensed hero **"PAINEL DE TREINO"** with "TREINO" in lime; an eyebrow with a pulsing spark; a full-width hero CTA with a nudging arrow; **staggered fade-up entrance** (reduced-motion safe).
- Removed on feedback: the oversized **clipped "FORJA" watermark**, and the **"Acesso restrito" / "Publicação sempre manual"** chips (noise on a login).

## Remaining work

- **Task 2** — relocate the stray `.admin-build-*` rules + hoist tokens/fonts to the top of `globals.css` (cosmetic; low value/risk — could fold into the CSS split).
- **Task 3** — map the remaining hardcoded `border-radius` onto `--radius-sm/md/lg`.
- **Task 4** — map the remaining hardcoded spacing / font-sizes onto `--space-*` / `--text-*` / `--display-*` (partial — login + the breathing-room pass already use tokens).
- **Phase 4+ (own plan)** — form **de-pollution** on `/admin/plans/new` and `/admin/plans/[planId]` (group sections, progressive disclosure, one primary CTA); density/tables; **skeletons + toasts**; unify the three `<details>` disclosures + two steppers into single primitives; split `globals.css` by feature.
- Optional: richer demo data to evaluate the dense internal screens (esp. the plan editor); further login polish if desired.

## Notes for continuing

- Keep the brand tokens; **no UI library** — `web/AGENTS.md` mandates hand-written namespaced CSS.
- `web/src/app/globals.test.ts` asserts CSS invariants — notably **no `font-size: clamp(...vw...)`** for titles (use fixed sizes + media-query breakpoints), plus the mobile-nav and `overflow-x: clip` guards.
- Commit subjects must be lowercase (commitlint).
