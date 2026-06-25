# Web Admin Foundation Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Forja web admin from a "scaled-up mobile app" into a real, polished desktop-and-mobile admin tool — by introducing a proper design-token layer, interaction states, a clear interactive-vs-static affordance language, and a responsive sidebar/bottom-nav shell — without changing the existing brand (lime accent, Bebas Neue, Syne, pill buttons, dark industrial theme).

**Architecture:** The admin uses hand-written CSS in `web/src/app/globals.css` (namespaced `.admin-*`) consuming CSS custom properties on `:root`, with React Server/Client components in `web/src/app` and shared primitives in `web/src/components/admin`. We deepen the token layer (space/type/radius/shadow/motion scales) and refactor existing magic numbers onto it, add `:hover`/`:active`/`:focus-visible` + a button size scale, split pill (interactive) from tag (static metadata), and rewrite `AdminFrame` into a CSS-grid shell (left sidebar on desktop, bottom-nav on mobile). No Tailwind/component library is introduced — `AGENTS.md` keeps styling hand-written.

**Tech Stack:** Next.js 16 (App Router) · React 19 · hand-written CSS + CSS custom properties · Vitest + `react-dom/server` `renderToStaticMarkup` for component tests.

**Scope:** This plan covers **Phase 1 (tokens), Phase 2 (interaction + affordance), Phase 3 (responsive shell)** in full detail — an independently shippable foundation that addresses the worst problems. **Phase 4+ (form de-pollution, density pass, skeletons/toasts, component unification, CSS file split)** is scoped as a roadmap at the end and will become its own plan, because it is best executed iteratively against rendered screens.

**Branch:** Work on `track/web-admin-foundation` per project convention; do not push to `main` without explicit confirmation.

**Verification note:** Where a step is pure CSS (no testable markup change), verification = run the app and compare the screen before/after. Use `pnpm --filter @forja/web dev` and capture the relevant route. After every task: `pnpm --filter @forja/web typecheck && pnpm --filter @forja/web test && pnpm --filter @forja/web lint` must stay green.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `web/src/app/globals.css` | Tokens + base + all `.admin-*` component styles | Modify (add token scales; refactor values; add interaction states; tag styles; grid shell) |
| `web/src/components/admin/AdminUi.tsx` | Shell + shared primitives (`AdminFrame`, `AdminCard`, `StatusPill`, `AdminField`) | Modify (sidebar shell; add `AdminTag`, button size prop helpers) |
| `web/src/components/admin/AdminUi.test.tsx` | Tests for the shared primitives | **Create** (does not exist yet) |
| `web/src/app/admin/**/page.tsx` (plans, import, builds, editor, new) | Screen markup that consumes the primitives | Modify (reclassify static pills → tags; apply button sizes) |
| `web/src/app/admin/**/page.test.tsx` | Existing screen tests | Modify (assert tag/affordance + a11y changes) |
| `docs/web/conventions.md` (or `web/AGENTS.md`) | Documented design system | Modify (document the new token scales + affordance rule) |

---

## Design Token Spec (the shared contract)

These are the concrete scales every task refers to. They snap the ~30 ad-hoc font sizes / dozens of spacing values / 6 radii currently in use onto rational scales. Added to `:root` in `globals.css` alongside the existing colors.

```css
/* Spacing — 4px grid */
--space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem;
--space-4: 1rem;     --space-5: 1.25rem; --space-6: 1.5rem;
--space-8: 2rem;     --space-10: 2.5rem; --space-12: 3rem;

/* Radius — pill stays reserved for interactive controls */
--radius-sm: 8px;   --radius-md: 12px;  --radius-lg: 16px;
--radius-pill: 100px;

/* Type — body (Syne) */
--text-2xs: 0.6875rem; --text-xs: 0.75rem;  --text-sm: 0.8125rem;
--text-base: 0.9375rem; --text-md: 1.0625rem;
/* Type — display (Bebas Neue) */
--display-sm: 1.5rem; --display-md: 2rem; --display-lg: 2.75rem; --display-xl: 3.5rem;
/* Line-height + tracking */
--leading-tight: 1.1; --leading-snug: 1.35; --leading-normal: 1.6;
--tracking-label: 0.14em; /* uppercase micro-labels — one tier only */

/* Elevation */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
--shadow-md: 0 8px 24px rgba(0,0,0,0.35);
--shadow-glow-accent: 0 0 18px var(--color-accent-glow);

/* Motion */
--duration-fast: 120ms; --duration-base: 180ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);

/* Layout */
--sidebar-w: 15rem;
--content-max: 78rem; /* wider canvas than today's 64rem */

/* Z-index */
--z-sticky: 10; --z-nav: 20; --z-toast: 40;
```

**Affordance rule (codified):** **Pill shape (`--radius-pill`) is reserved for interactive controls** — buttons, toggles, nav links, the file-select button. **Static metadata uses `.admin-tag` with `--radius-sm`**, lower emphasis, and never `cursor: pointer`. This is the fix for "tags enormes que parecem botões mas não são clicáveis."

**Button size scale:** default `md` = `2.75rem` (44px) height; `sm` = `2.25rem`; `lg` = `3.5rem` reserved for the **single** primary CTA per view. Today everything is 3.5rem (the "botões enormes" complaint).

---

## Phase 1 — Token Foundation

### Task 1: Add token scales to `:root` (additive, no visual change)

**Files:**
- Modify: `web/src/app/globals.css:239-257` (the `:root` block)

- [ ] **Step 1: Add the token scales inside `:root`**

Append the full Design Token Spec block above into the existing `:root { ... }` (after `--radius-pill: 100px;`, before the closing brace). This is purely additive — nothing consumes them yet.

- [ ] **Step 2: Verify the app still builds and renders identically**

Run: `pnpm --filter @forja/web build`
Expected: build succeeds. Open `/admin`, `/admin/plans`, `/admin/import`, `/admin/mobile-builds` — screens are pixel-identical (tokens unused so far).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(web): add design token scales (space/type/radius/shadow/motion) to :root"
```

### Task 2: Relocate the stray rules so the token block leads the file

**Files:**
- Modify: `web/src/app/globals.css:1-237` (stray `.admin-build-*` rules + `@font-face` declarations currently sit above `:root`)

- [ ] **Step 1: Move all `@font-face` declarations and `:root` to the very top of the file**

Cut the `@font-face` blocks (BebasNeue at `:1-5`, the three Syne blocks at `:218-237`) and the `:root` block, and paste them as the first content of the file, in this order: `@font-face` × 4, then `:root`. Move the orphaned `.admin-build-*` rules (`:7-216`) down to sit next to the other build styles (search for `.admin-build-page` siblings; group them).

- [ ] **Step 2: Verify no rule was dropped**

Run: `git diff --stat web/src/app/globals.css` (line count should be ~unchanged) and `pnpm --filter @forja/web build`.
Expected: build succeeds; visual diff on the four screens = none.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(web): hoist tokens/fonts to top of globals.css, regroup build rules"
```

### Task 3: Refactor radii onto the radius scale

**Files:**
- Modify: `web/src/app/globals.css` (all `border-radius` declarations)

- [ ] **Step 1: Replace every literal `border-radius` with a scale token**

Map: `8px → var(--radius-sm)`; `12px → var(--radius-md)`; `14px → var(--radius-md)`; `16px → var(--radius-lg)`; `18px → var(--radius-lg)`; `100px`/`999px` on interactive controls → `var(--radius-pill)`. Leave `--radius-pill` literal only inside its own definition. (14px and 18px are intentionally collapsed onto the nearest scale step — this removes two off-scale radii.)

- [ ] **Step 2: Verify visually**

Run the app; check cards, inputs, banners, stepper, build rows. Expected: corners look consistent; the only intended deltas are the former 14px/18px corners now matching 12/16px.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(web): map all radii onto --radius-sm/md/lg/pill scale"
```

### Task 4: Refactor spacing + type onto the scales

**Files:**
- Modify: `web/src/app/globals.css` (padding/margin/gap and font-size declarations)

- [ ] **Step 1: Snap spacing to the 4px grid**

Replace one-off `padding`/`margin`/`gap` values with the nearest `--space-*` token (e.g. `0.45rem → var(--space-2)`, `0.65rem/0.7rem/0.8rem/0.85rem/0.9rem/0.95rem → var(--space-3)` or `--space-4` by visual weight, `1.1rem/1.15rem/1.25rem → var(--space-5)`, `1.75rem → var(--space-8)`). Keep hairline values (`1px`, `2px`, `3px`) literal.

- [ ] **Step 2: Snap font sizes to the type scale**

Replace body font-sizes with `--text-2xs/xs/sm/base/md` by role, and display sizes with `--display-sm/md/lg/xl`. Cap `.admin-title` at `var(--display-xl)` (3.5rem) instead of 4.8rem — this is the intended hero reduction.

- [ ] **Step 3: Verify visually on all screens**

Run the app. Expected deltas: hero titles smaller and tighter; spacing rhythm more regular. No layout breakage.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(web): map spacing and type onto --space/--text/--display scales; cap hero title"
```

---

## Phase 2 — Interaction States & Affordance

### Task 5: Add hover/active/focus + button size scale

**Files:**
- Modify: `web/src/app/globals.css:644-691` (button block)

- [ ] **Step 1: Add states + size variants to the button rules**

After the existing `.admin-primary-button`/`.admin-secondary-button`/`.admin-danger-button` declarations, add:

```css
.admin-primary-button,
.admin-secondary-button,
.admin-danger-button {
  min-height: 2.75rem; /* md default — was 3.5rem */
  transition: background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    transform var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-base) var(--ease-standard);
}
.admin-button-lg { min-height: 3.5rem; padding: 0 var(--space-6); }
.admin-button-sm { min-height: 2.25rem; padding: 0 var(--space-4); font-size: var(--text-2xs); }

.admin-primary-button:hover { box-shadow: var(--shadow-glow-accent); }
.admin-secondary-button:hover { border-color: var(--color-accent); color: var(--color-text); }
.admin-danger-button:hover { background: rgba(255, 69, 58, 0.18); }
.admin-primary-button:active,
.admin-secondary-button:active,
.admin-danger-button:active { transform: translateY(1px) scale(0.99); }

.admin-primary-button:focus-visible,
.admin-secondary-button:focus-visible,
.admin-danger-button:focus-visible,
.admin-nav-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

- [ ] **Step 2: Verify visually + keyboard**

Run the app. Hover each button → state changes; Tab through → visible accent focus ring; primary CTAs that should stay large get `admin-button-lg`. Default buttons are now 44px (smaller).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(web): button hover/active/focus states + sm/md/lg size scale"
```

### Task 6: Introduce `AdminTag` and split static metadata from interactive pills

**Files:**
- Modify: `web/src/components/admin/AdminUi.tsx`
- Create: `web/src/components/admin/AdminUi.test.tsx`
- Modify: `web/src/app/globals.css` (add `.admin-tag`)

- [ ] **Step 1: Write the failing test for `AdminTag`**

Create `web/src/components/admin/AdminUi.test.tsx`:

```tsx
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AdminTag, StatusPill } from './AdminUi'

describe('AdminTag', () => {
  it('renders a non-interactive metadata tag, not a pill/button', () => {
    const markup = renderToStaticMarkup(createElement(AdminTag, { children: '12 exercícios' }))

    expect(markup).toContain('admin-tag')
    expect(markup).toContain('12 exercícios')
    expect(markup).not.toContain('status-pill')
    expect(markup).not.toContain('admin-primary-button')
    expect(markup).not.toContain('href')
    expect(markup).not.toContain('role="button"')
  })
})

describe('StatusPill', () => {
  it('still renders semantic status pills with a tone', () => {
    const markup = renderToStaticMarkup(
      createElement(StatusPill, { tone: 'accent', children: 'Publicado' }),
    )
    expect(markup).toContain('status-pill')
    expect(markup).toContain('data-tone="accent"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @forja/web test -- AdminUi`
Expected: FAIL — `AdminTag` is not exported.

- [ ] **Step 3: Implement `AdminTag` in `AdminUi.tsx`**

Add after `StatusPill`:

```tsx
type AdminTagProps = {
  children: ReactNode
}

export function AdminTag({ children }: AdminTagProps): ReactElement {
  return <span className="admin-tag">{children}</span>
}
```

- [ ] **Step 4: Add `.admin-tag` styling to `globals.css`**

```css
.admin-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-med);
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  padding: 0.25rem var(--space-3);
}
.admin-tag::before { /* subtle non-interactive marker */
  content: '';
  width: 0.3rem; height: 0.3rem; border-radius: 999px;
  background: var(--color-dim);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @forja/web test -- AdminUi`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/admin/AdminUi.tsx web/src/components/admin/AdminUi.test.tsx web/src/app/globals.css
git commit -m "feat(web): add AdminTag for static metadata, distinct from interactive pills"
```

### Task 7: Reclassify look-like-buttons-but-aren't spans to `AdminTag`

**Files:**
- Modify: build page + editor + import + login screens that render static `<span>` pills
- Modify: `web/src/app/admin/**/page.test.tsx` for the touched screens

- [ ] **Step 1: Update the build-page test to assert tags, not pills, for metadata**

In `web/src/app/admin/mobile-builds/page.test.tsx` (and equivalent), change the metadata assertions to expect `admin-tag` where the markup previously emitted bordered metadata spans (build type, date, duration). Add: `expect(markup).toContain('admin-tag')`. Keep `status-pill` assertions only for true status (e.g. "Build em andamento").

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @forja/web test -- mobile-builds`
Expected: FAIL — markup still emits the old metadata spans.

- [ ] **Step 3: Replace static metadata spans with `<AdminTag>`**

In the build, editor, import, and login screens, replace non-interactive metadata `<span>` elements (`.admin-build-meta span`, `.admin-build-type`, `.admin-publication-meta span`, `.admin-import-exercise-meta span`, `.admin-login-assurance span`) with `<AdminTag>…</AdminTag>`. Leave `StatusPill` for actual statuses and `.admin-primary/secondary-button` for actions. Remove the now-dead CSS rules for the replaced selectors.

- [ ] **Step 4: Run the touched screen tests**

Run: `pnpm --filter @forja/web test -- mobile-builds plans import login`
Expected: PASS.

- [ ] **Step 5: Verify visually**

Run the app: metadata now reads clearly as static info (square-ish, low-emphasis, leading dot); only buttons and nav are pill-shaped. The affordance confusion is gone.

- [ ] **Step 6: Commit**

```bash
git add web/src/app web/src/app/globals.css
git commit -m "refactor(web): convert non-interactive metadata pills to AdminTag (fix affordance)"
```

### Task 8: Accent discipline — one focal point per view

**Files:**
- Modify: `web/src/app/globals.css` (accent-gradient surfaces)

- [ ] **Step 1: Demote secondary accent surfaces to neutral**

Keep the lime gradient only on the **single** primary surface per screen (the "Próxima ação" / focus panel). For `.admin-summary-strip`, `.admin-build-summary`, and generic `.admin-card-accent` used as containers, replace the lime gradient background with a neutral surface (`var(--color-surface)`) and a hairline `var(--color-border)`, reserving the accent for the metric numbers / the one CTA. Keep `.admin-accent-bar` only on the focal card.

- [ ] **Step 2: Verify visually**

Run the app. Expected: each screen now has one clear lime focal point; the rest recedes. The "everything glows" effect is gone.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(web): limit accent gradients to one focal surface per view"
```

### Task 9: Fix sub-AA contrast on dim text

**Files:**
- Modify: `web/src/app/globals.css:1466,1588` (and any other `--color-dim` used as text)

- [ ] **Step 1: Raise dim-as-text to muted**

Replace `color: var(--color-dim)` with `color: var(--color-muted)` everywhere it is used for readable text (`.admin-plan-card-meta dt`, `.admin-table-row small`). Keep `--color-dim` only for decorative elements (dots, disabled borders).

- [ ] **Step 2: Verify contrast**

Spot-check `.admin-plan-card-meta dt` and `.admin-table-row small` against `#111`/`#1c1c1c`. `#888` on `#111` ≈ 5.1:1 (passes AA for small text); `#444` failed (~2:1).

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "fix(web): raise dim-as-text labels to muted for WCAG AA contrast"
```

---

## Phase 3 — Responsive Shell (sidebar desktop / bottom-nav mobile)

### Task 10: Rewrite `AdminFrame` to a sidebar + content structure

**Files:**
- Modify: `web/src/components/admin/AdminUi.tsx:42-87`
- Modify: `web/src/components/admin/AdminUi.test.tsx`

- [ ] **Step 1: Write the failing shell test**

Add to `web/src/components/admin/AdminUi.test.tsx`:

```tsx
import { AdminFrame } from './AdminUi'

describe('AdminFrame shell', () => {
  it('renders a sidebar nav with all destinations and marks the active one', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFrame, {
        active: 'plans',
        eyebrow: 'GESTÃO',
        title: 'Treinos',
        children: createElement('p', null, 'conteúdo'),
      }),
    )

    expect(markup).toContain('admin-sidebar')
    expect(markup).toContain('href="/admin"')
    expect(markup).toContain('href="/admin/plans"')
    expect(markup).toContain('href="/admin/import"')
    expect(markup).toContain('href="/admin/mobile-builds"')
    // active destination is marked for assistive tech, not just visually
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('data-active="true"')
    expect(markup).toContain('Sair')
    expect(markup).toContain('conteúdo')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @forja/web test -- AdminUi`
Expected: FAIL — current `AdminFrame` renders `.admin-topbar`, no `.admin-sidebar`, no `aria-current`.

- [ ] **Step 3: Rewrite `AdminFrame`**

Replace the `AdminFrame` body (`AdminUi.tsx:50-86`) with a sidebar + content shell:

```tsx
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Navegação admin">
        <Link className="admin-wordmark" href="/admin">
          FORJA ADMIN
        </Link>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === active
            return (
              <Link
                key={item.key}
                className="admin-nav-link"
                data-active={isActive}
                aria-current={isActive ? 'page' : undefined}
                href={item.href}
              >
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <form className="admin-sidebar-footer" action="/api/admin/auth/logout" method="post">
          <button className="admin-secondary-button admin-button-sm" type="submit">
            Sair
          </button>
        </form>
      </aside>
      <main className="admin-content">
        <header className="admin-header-row">
          <div>
            <p className="admin-section-label">{eyebrow}</p>
            <h1 className="admin-title">{title}</h1>
            {subtitle ? <p className="admin-subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
        {children}
      </main>
    </div>
  )
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @forja/web test -- AdminUi`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/admin/AdminUi.tsx web/src/components/admin/AdminUi.test.tsx
git commit -m "feat(web): rewrite AdminFrame as sidebar+content shell with aria-current"
```

### Task 11: CSS grid shell — sidebar on desktop, bottom-nav on mobile

**Files:**
- Modify: `web/src/app/globals.css` (`.admin-shell`, `.admin-sidebar`, `.admin-content`, `.admin-nav`, media queries)

- [ ] **Step 1: Make the shell a two-column grid on desktop**

```css
.admin-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100vh;
}
.admin-sidebar {
  position: sticky; top: 0; height: 100vh;
  display: grid; grid-template-rows: auto 1fr auto;
  gap: var(--space-6); padding: var(--space-6) var(--space-5);
  border-right: 1px solid var(--color-border);
  background: rgba(8, 8, 8, 0.86);
}
.admin-nav { display: grid; gap: var(--space-2); align-content: start; }
.admin-nav-link {
  justify-content: flex-start;
  transition: background var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}
.admin-nav-link:hover { border-color: var(--color-border-med); color: var(--color-text); }
.admin-content { width: 100%; max-width: var(--content-max); margin: 0 auto; padding: var(--space-8) var(--space-8) var(--space-12); }
.admin-sidebar-footer { margin: 0; }
```

Remove the obsolete `.admin-topbar` / `.admin-top-nav` rules (no longer rendered).

- [ ] **Step 2: Collapse to bottom-nav at ≤860px**

Update the `@media (max-width: 860px)` block so the shell stacks and the sidebar becomes a fixed bottom bar:

```css
@media (max-width: 860px) {
  .admin-shell { grid-template-columns: 1fr; }
  .admin-sidebar {
    position: fixed; inset: auto 0 0 0; height: auto;
    grid-template-rows: none; grid-auto-flow: column;
    align-items: center; gap: var(--space-2);
    padding: var(--space-3) var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom));
    border-right: 0; border-top: 1px solid var(--color-border);
    background: rgba(8, 8, 8, 0.96);
    -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    z-index: var(--z-nav);
  }
  .admin-wordmark, .admin-sidebar-footer { display: none; }
  .admin-nav { grid-auto-flow: column; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); width: 100%; }
  .admin-nav-link { justify-content: center; min-height: 3.1rem; font-size: var(--text-2xs); }
  .admin-content { padding: var(--space-5) var(--space-4) calc(6rem + env(safe-area-inset-bottom)); }
}
```

- [ ] **Step 3: Verify both breakpoints visually**

Run the app at ≥1200px (sidebar left, wide canvas), at ~768px (bottom nav, single column), and at 375px (bottom nav, tight). Expected: real admin layout on desktop; thumb-friendly bottom nav on mobile; no horizontal scroll.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(web): responsive grid shell — desktop sidebar, mobile bottom-nav"
```

### Task 12: Tighten the per-screen header for tool altitude

**Files:**
- Modify: `web/src/app/globals.css` (`.admin-header-row`, `.admin-title`, `.admin-section-label`)

- [ ] **Step 1: Reduce header weight on desktop**

Set `.admin-title` to `var(--display-lg)` (2.75rem) within `.admin-content` (hero was 4.8rem → already capped to xl in Task 4; tool screens use lg), add `margin-bottom: var(--space-6)` to `.admin-header-row`, and align the optional `action` to the header baseline so primary actions sit beside the title rather than below.

- [ ] **Step 2: Verify visually**

Run the app on every screen. Expected: the giant title no longer dominates the viewport; the primary action is reachable without scrolling.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(web): tighten screen headers to tool altitude"
```

---

## Phase 3 wrap-up

- [ ] Run the full gate: `pnpm --filter @forja/web typecheck && pnpm --filter @forja/web test && pnpm --filter @forja/web lint` — all green.
- [ ] Document the token scales + the pill-vs-tag affordance rule + button size scale in `web/AGENTS.md`, then commit `docs(web): document token scales and affordance rule`.
- [ ] Use superpowers:finishing-a-development-branch to decide merge/PR. **Do not push to `main` without explicit confirmation** (it triggers a CI build).

---

## Roadmap — Phase 4+ (separate plan, written after this ships)

These address the remaining complaints ("forms com muitas infos", "tela muito poluída") and are best done iteratively against rendered screens:

1. **Form de-pollution** — group the new-plan / editor forms into a small number of clearly-labelled sections; push non-essential fields behind one unified disclosure; reduce simultaneous accent panels; give each form one `admin-button-lg` primary action. Target screens: `/admin/plans/new`, `/admin/plans/[planId]`, `/admin/import`.
2. **Density pass** — adopt the `.admin-data-table` for plan/build lists where a table reads better than cards; cap card `min-height`; reduce stacked panels.
3. **Skeletons + toasts** — `Suspense` skeleton loaders for async server components; a lightweight toast for save/publish confirmations (replacing the inline lime "save status" pill).
4. **Component unification** — one accordion primitive replacing the three `<details>` patterns; one stepper replacing `.admin-stepper` + `.admin-workflow-step`.
5. **CSS file split** — break `globals.css` into `tokens.css` + `base.css` + `components/*.css` imported from the layout, once the value churn above has settled.

---

## Self-Review

- **Spec coverage:** Tokens (Tasks 1–4) ✓ · interaction states / "botões enormes" → size scale (Task 5) ✓ · "tags que parecem botões" → AdminTag + reclassify (Tasks 6–7) ✓ · accent overuse (Task 8) ✓ · contrast (Task 9) ✓ · responsive sidebar/bottom-nav shell (Tasks 10–11) ✓ · hero/altitude (Tasks 4 & 12) ✓ · "forms poluídos / tela poluída" → Roadmap Phase 4 (deferred, scoped) ✓.
- **Placeholder scan:** every code step ships concrete CSS/TSX/test code; no TBD/TODO.
- **Type consistency:** `AdminTag`/`StatusPill`/`AdminFrame` exports and the class names (`admin-tag`, `admin-button-sm/lg`, `admin-sidebar`, `aria-current`) are used identically across tasks and tests.
