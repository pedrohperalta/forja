# @forja/web — Conventions

Scope: this package (`web/`). For onboarding/commands see [`README.md`](./README.md).
General repo rules (Conventional Commits, branching, language) live in the root
`AGENTS.md`. **Code and comments in English; user-facing UI text in pt-BR.**

## Stack

Next.js 16 (App Router) · React 19 · Drizzle ORM + Postgres · Zod (shared
schemas from `@forja/domain`) · Vitest. Strict TypeScript
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).

## Architecture & layering

Requests flow in one direction, enforced by ESLint (`no-restricted-imports` in
`eslint.config.mjs`):

```
route handler (src/app/api/**/route.ts)
  -> service   (src/server/services/**)
  -> repository (src/server/repositories/**)
  -> db        (src/server/db)
```

- **Route handlers** authenticate, parse/validate input, call services, and
  shape the HTTP response. They obtain the db handle via `getDatabase()` and
  must **not** import `@/server/repositories` directly — go through a service.
- **Services** hold business logic and are the only callers of repositories.
- **Repositories** are thin, per-entity Drizzle query modules under
  `src/server/repositories/` (`users`, `auth`, `plans`, `workouts`,
  `equipmentPhotos`, `importJobs`, shared `types`), re-exported by `index.ts`.
  Add a new query to its entity module, not a catch-all file.
- **Client components** (`src/components/**`) must not import `@/server/**`
  (server-only code). Server modules must not import `next/*` or UI.

## Error handling

Services and auth throw typed `AppError`s (`src/server/http/appError.ts`):
`badRequest`, `validation`, `unauthenticated`, `invalidToken`, `forbidden`,
`notFound`, `invalidCursor`, `payloadTooLarge`, `unsupportedMediaType`,
`modelOutputInvalid`. Route handlers wrap their body in `try/catch` and return
`toErrorResponse(error, id)`, which maps an `AppError` to its code+status, a
JSON `SyntaxError` to 400, and anything else to a logged 500. **Do not** map
unrelated failures to 401 — let `toErrorResponse` classify them.

## Validation

Validate all external input with Zod, preferring the shared schemas in
`@forja/domain`. Derive types with `z.infer`; don't hand-write parallel
interfaces.

## Testing (TDD, strict)

- Write the failing test first. Unit tests are colocated (`*.test.ts` /
  `*.test.tsx`). Component tests render with `react-dom/client` under a per-file
  `// @vitest-environment jsdom` annotation.
- Integration tests are named `*.integration.test.ts`, hit a real Postgres, and
  run only via `pnpm test:db` (excluded from the default `pnpm test`).
- `pnpm coverage` enforces a floor (see `vitest.config.ts`); raise it as
  coverage grows. The DB/service layer is covered by the integration suite.

## Gate

No CI. `pnpm verify` (root) runs on `git push` (lefthook `pre-push`) and is the
authoritative gate: build domain → typecheck → lint → unit tests, all packages.

## UI design system

The admin has **no Tailwind / component library** — it is hand-written CSS in
`src/app/globals.css`, namespaced `.admin-*`, consuming design tokens defined as
CSS custom properties on `:root`. **That `:root` block is the source of truth.**
Never hardcode hex colors or px radii in a component — reference a token.

- **Brand / theme:** dark UI on `--color-background: #080808`, surfaces
  `--color-surface`/`--color-surface-2`, borders `--color-border`/`-med`. Lime
  accent `--color-accent: #c2f000` (+ `--color-accent-dim`/`-glow`). Feedback:
  `--color-danger` (#ff453a), `--color-warning` (#f59e0b), each with a `-dim`.
  Text scale: `--color-text` / `-med` / `--color-muted` / `--color-dim`. This
  matches the mobile app's brand (lime accent, Bebas Neue) — keep them aligned.
- **Typography:** `'BebasNeue'` (display — titles, hero text, stat/KPI numbers);
  `'Syne'` (UI — body, labels, buttons). Section labels use `.admin-section-label`,
  titles `.admin-section-title`.
- **Shape:** buttons are pills — `--radius-pill: 100px`.
- **Buttons:** `.admin-primary-button` (CTA; pair with the `.bg-accent` utility
  for the lime fill), `.admin-compact-button` (smaller), `.admin-danger-button`
  (destructive). `.bg-accent` (`background: var(--color-accent)`) is a real,
  intentional utility — not a leftover Tailwind class.
- **Component vocabulary** (extend these; don't invent parallel styles):
  sections/cards (`.admin-section`, `.admin-card`, `.admin-panel`), KPIs
  (`.admin-kpi-*`), forms (`.admin-form-*`, `.admin-field-*`, `.admin-input`),
  file upload (`.admin-file-*`), build pipeline (`.admin-build-*`,
  `.admin-log-*`), plans/imports/workflows (`.admin-plan-*`, `.admin-import-*`,
  `.admin-workflow-*`), login (`.admin-login-*`).
- **States:** loading/empty/error/feedback have dedicated classes — reuse them:
  `.admin-empty-state`, `.admin-error-banner`, `.admin-notice-banner`,
  `.admin-field-error`, `.admin-save-status`, `.admin-live-status`,
  `.admin-danger-zone`, `.admin-muted`.

Adding UI: extend `globals.css` with `.admin-*` classes that consume the
existing tokens; reuse the component vocabulary above before adding new classes.

### UX research before new screens

Before implementing a **new** admin screen (not a tweak to an existing one),
run a UX research sub-agent first to ground layout, states, and interactions —
then build. Validate diffs that touch `src/app/**` or `src/components/**`
against this design system (see the `ux-patterns-reviewer` agent).
