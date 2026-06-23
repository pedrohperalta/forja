# Design — Web engineering & UX standards for `@forja/web`

- **Date:** 2026-06-23
- **Status:** Draft (awaiting user review)
- **Author:** Pedro + Claude
- **Scope:** `web/` (`@forja/web`), `packages/domain` (`@forja/domain`), and monorepo root tooling

## Context

After the latest `git pull`, Forja is a **pnpm monorepo** with three packages:

- `mobile/` (`@forja/mobile`) — Expo/React Native app. Already mature: ESLint (expo preset), Jest, strict TDD.
- `web/` (`@forja/web`) — Next.js 16 admin (App Router) + Drizzle ORM + Postgres. Serves the admin UI **and** the mobile sync/auth API.
- `packages/domain` (`@forja/domain`) — shared Zod schemas / domain types.

`web/` is already well-structured: strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), a clean server layer (`auth/ db/ http/ repositories/ services/ storage/`), 38 test files (unit + integration), Drizzle migrations, standalone Dockerfile. It is **not** pattern-less — but it is missing several engineering disciplines that the mature `gen-ai-masons` project enforces.

**Goal:** Adopt the missing `gen-ai-masons` disciplines into `web` + `domain` + the monorepo root, **adapted to web's actual idioms** (HTTP route handlers — not RSC server actions; Drizzle — not Prisma; a hand-written plain-CSS admin — not a component library), rather than copied verbatim.

### What the current code reveals (drives the design)

- **Error handling is ad-hoc and has a real bug.** Route handlers wrap everything in per-route `try/catch`. `web/src/app/api/mobile/v1/sync/push/route.ts` maps **any** thrown error to `401 unauthenticated` — so a service failure (`"Plan not found"`) is reported as an auth failure. A clean `ErrorCode` union + `errorResponse()` already exist in `web/src/server/http/responses.ts`, but there is no bridge from service throws → HTTP codes.
- **`web/src/server/repositories/index.ts` is a 910-line monolith** mixing users / oauth / refresh tokens / admin sessions / mobile auth codes / plans / workouts / equipment photos / import jobs. "Doing too much" — a natural split target.
- **`web` and `domain` have no ESLint at all.** Only `mobile/` is linted. Root `pnpm lint` runs `mobile` only, and the lefthook `lint` command does the same — so ~95 web TS files are never linted, even on commit (false green).
- **The admin has an implicit, undocumented design system.** No Tailwind/shadcn/component library — a single `web/src/app/globals.css` of **2436 lines** with `.admin-*` (BEM-ish) classes. It reuses the Forja brand (dark theme, accent lime `#C2F000`, Bebas Neue display font) entirely by hand. There is dead leftover (`className="... bg-accent"` — no Tailwind in web, so it does nothing). The design exists but is invisible and unenforced.
- **Component tests** use raw `react-dom/client` with a per-file `// @vitest-environment jsdom` annotation (no Testing Library). `jsdom` is currently resolved via workspace hoist, not declared in `web` devDeps (fragile).

## Non-goals (explicitly out of scope)

- **CI / GitHub Actions** — everything runs locally; the **pre-push hook is the authoritative gate**.
- **Playwright / e2e tests** — vitest only.
- **MegaLinter, SonarQube, connector-registry parity, Jade design system** — too heavy for the admin's size.
- **`ui-smoke` (run app + screenshot visual audit)** — **deferred / optional.** It reintroduces running the app, which conflicts with dropping e2e. May be flipped on during review.
- **Full refactor of `globals.css`** — Phase 7 documents and lightly cleans it; a structural split is noted as future work, not forced now.
- **Touching the `mobile/` lint setup** — it already works; left as-is.

## Key decisions

| Topic | Decision |
|-------|----------|
| ESLint layout | **Per-package** configs (`web`, `domain` each get their own; `mobile` unchanged). |
| Error handling | **Typed `AppError` + `handleRoute` wrapper** (Option A below). |
| Repositories | **Split the monolith by entity**, behavior-preserving, behind an unchanged barrel. |
| Local gate | `pnpm verify` (typecheck + lint + unit) wired to **lefthook `pre-push`**; integration tests stay manual (need Postgres). |
| UX | **Documented web design system + `ux-patterns-reviewer` agent + "UX research before new screens" rule.** |
| TDD | **Strict** (per AGENTS.md): tests first for new/changed behavior; pure refactors guarded by existing tests. |
| Language | Code, comments, docs in **English**; UI text in **pt-BR** (per AGENTS.md). |

### Error-handling approach (the one real architectural choice)

- **(A) Typed error + route wrapper — CHOSEN.** A small `AppError { code: ErrorCode; status: number }` class with helper constructors (`notFound()`, `validation()`, `unauthenticated()`, …). Services `throw` typed errors; a single `handleRoute()` / `toErrorResponse()` maps `AppError → errorResponse`, `SyntaxError → invalid_request 400`, and anything else → `internal_error 500` (logged). Lowest churn (services already throw), fixes the 401 bug, removes per-route duplication.
- (B) Services return a discriminated `Result<T>` — "purer" but rewrites every service signature and its tests. Rejected (cost).
- (C) Just patch the catch-all without a typed error class — cheap but neither standardizes nor scales. Rejected.

## Phases

Each phase is independently testable and committable (Conventional Commits). Sequencing: lint first (foundation, surfaces issues) → refactors now guarded by lint + tests → test hardening → gate (everything green) → docs/AI tooling → UX.

### Phase 1 — Lint foundation (`web` + `domain`), per-package

- Add ESLint devDeps to `web`: `eslint`, `typescript-eslint`, `eslint-config-next` (or `@next/eslint-plugin-next`), `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`.
- `web/eslint.config.mjs` (flat):
  - `typescript-eslint` **recommendedTypeChecked** (via `projectService`) over `src/**`.
  - Next `core-web-vitals` + `react-hooks` for `app/**` and `components/**`.
  - `eslint-config-prettier` **last** (so it disables stylistic rules that fight `.prettierrc`: no-semi, single quotes, trailing-comma all, printWidth 100).
  - Architectural rules via `no-restricted-imports`:
    - `components/**` (client) must not import `@/server/**`.
    - `app/**/route.ts` must not import `@/server/repositories/**` directly (go through `@/server/services/**`); importing `@/server/db/client` to obtain a handle is allowed.
    - `server/services/**` and `server/repositories/**` must not import `next/*`, `@/app/*`, or `@/components/*`.
  - `ignores`: `.next/`, `node_modules/`.
  - Add `"lint": "eslint ."` and `"lint:fix": "eslint . --fix"` to `web/package.json`.
- `packages/domain/eslint.config.mjs`: `typescript-eslint` recommendedTypeChecked lib config; add `lint` script + devDeps.
- Root `package.json`: `"lint": "pnpm -r --if-present lint"` (now covers mobile + web + domain) — kills the false green.
- `lefthook.yml`: the existing `pre-commit > lint` runs `pnpm lint`, which now covers all packages.
- **Baseline:** run `pnpm -r lint`; fix violations (including removing the dead `bg-accent`). If the count is large, freeze with targeted inline disables and note the count in the commit, to be cleaned incrementally.
- **Acceptance:** `pnpm -r lint` exits clean.

### Phase 2 — Typed errors + `handleRoute`

- `web/src/server/http/appError.ts`: `class AppError extends Error { code: ErrorCode; status: number }` + helpers mapping to the existing `ErrorCode` union (`invalidRequest`, `validation`, `unauthenticated`, `forbidden`, `notFound`, `invalidToken`, `payloadTooLarge`, `unsupportedMediaType`, …).
- `web/src/server/http/responses.ts`: add `toErrorResponse(error, id)` (`AppError → errorResponse(code,message,status,id)`; `SyntaxError → invalid_request 400`; else `internal_error 500` + `console.error`) and an optional `handleRoute(handler)` HOF that owns `requestId` + try/catch.
- Refactor route handlers to use it — **delete the catch-all → 401**. Auth services must throw `unauthenticated()`/`invalidToken()` so 401/401 happen only for real auth failures; other failures map correctly.
- Services: replace `throw new Error('Plan not found')` → `throw notFound(...)`, `'Archived plans cannot be edited'` → `forbidden(...)`, `'Exercise not found'` → `notFound(...)`, etc.
- **TDD:** write/extend route tests first asserting the correct status per error class (e.g. `sync/push`: invalid token → 401, unknown plan → 404, bad payload → 422 — never the blanket 401).
- **Acceptance:** route + service tests green; no route maps unrelated errors to 401.

### Phase 3 — Split `repositories/index.ts`

- `repositories/types.ts`: `Database`, the `*Row` types, and the `required()` helper.
- Per-entity modules: `users.ts`, `auth.ts` (oauth accounts + refresh tokens + admin sessions + mobile auth codes), `plans.ts`, `workouts.ts`, `equipmentPhotos.ts`, `importJobs.ts`.
- `repositories/index.ts`: barrel that re-exports everything, so existing import paths (`@/server/repositories`, `../../repositories`) are unchanged.
- **Behavior-preserving;** guarded by the existing `repositories.integration.test.ts` and service tests.
- **Acceptance:** typecheck + unit + (manual) integration green; `index.ts` only re-exports.

### Phase 4 — Vitest hardening (`web` + `domain`)

- Add `jsdom` explicitly to `web` devDeps (stop relying on hoist; per-file `@vitest-environment jsdom` annotations stay).
- `web/vitest.config.ts`: keep the `@` alias; add `test.coverage` (provider `v8`; reporters `text`, `html`, `lcov`; `include: ['src/**']`; exclude tests, `types/`, `db/migrations/`, `*.config.*`, `**/*.test.*`). Add a `coverage` script.
- Set coverage **thresholds to the measured baseline** (rounded down) so they ratchet without breaking the current tree.
- `domain`: equivalent coverage setup.
- **Acceptance:** `pnpm --filter @forja/web test` and `--filter @forja/domain test` green with coverage; thresholds enforced.

### Phase 5 — Local authoritative gate (pre-push)

- Root `package.json`: `"verify": "pnpm -r typecheck && pnpm -r lint && pnpm -r --if-present test"` (unit only — `web`'s `test` already excludes `*.integration.test.ts`).
- `lefthook.yml`: add `pre-push: commands: verify: run: pnpm verify` (blocks the push on failure). `pre-commit` stays light; its `lint` now covers all packages.
- Integration tests (`pnpm --filter @forja/web test:db`, need Postgres via `deploy/forja/compose.local.yml`) documented as a **manual** step — kept out of the hook to avoid flakiness.
- **Acceptance:** a deliberately broken lint/type/unit-test blocks `git push` locally.

### Phase 6 — Conventions doc + AI tooling + onboarding

- `web/AGENTS.md` (scoped to `@forja/web`): architecture & layering (route → service → repository → db; client never imports server), the error pattern, repository organization, test conventions (unit vs integration, jsdom annotation, TDD), how to run (`dev`/`build`/`test`/`test:db`/`lint`/`typecheck`; Drizzle migrate/seed), env vars (reference `env.ts`), "no CI/e2e — local pre-push gate is authoritative", commit conventions, language rules.
- `.claude/hooks/lint-after-edit.sh`: on `PostToolUse(Edit|Write|MultiEdit)`, run ESLint on edited `web/` or `packages/domain` `.ts/.tsx` files; report to stderr; **non-blocking**; skip tests/`node_modules`/`.next`.
- `.claude/settings.json`: add the `hooks.PostToolUse` entry (preserve `enabledPlugins`).
- `web/.env.example`: the 12 vars from `env.ts` with comments + safe placeholders (no real secrets).
- `web/README.md`: setup / env / db (migrate, seed) / run / test / lint quickstart.
- **Acceptance:** docs present; hook fires on edit; `.env.example` keys match the `ServerEnvSchema`.

### Phase 7 — Web admin UX / design discipline

- **Design system doc** (in `web/AGENTS.md` "UI Design System" section, mirroring the mobile block's structure): reverse-engineer `globals.css` into documented patterns — brand (dark theme, accent `#C2F000`, Bebas Neue display), the `.admin-*` taxonomy (sections, forms/inputs, primary/compact buttons, status & live-refresh, build cards), interaction states (loading / empty / error / disabled), layout conventions (e.g. content width `min(100%, 58rem)`).
- Remove the dead `bg-accent` (and any other Tailwind-isms that don't exist in web).
- `.claude/agents/ux-patterns-reviewer.md` (web-scoped): **plan mode** (review proposed UI work against documented patterns) + **diff mode** (review `BASE..HEAD` changes touching `web/src/app` or `web/src/components`); severity-graded; blocks on high-severity drift.
- Register the standing rule in `web/AGENTS.md`: **"run a UX research sub-agent before implementing new admin screens"** (per user feedback).
- Note (not forced now): `globals.css` (2436 lines) can later be split by concern.
- `ui-smoke`: **deferred/optional** — decide at review.
- **Acceptance:** design-system doc matches current `globals.css`; reviewer agent is invocable; dead `bg-accent` removed.

## Risks / open items

- **Lint baseline size.** ~95 unlinted web files may surface many violations. If large, freeze with targeted disables and fix incrementally (note the count) rather than blocking the whole effort.
- **Type-checked lint is slower** — acceptable for a local-only gate.
- **Coverage thresholds** must be pinned to the measured baseline to avoid an immediate red gate.
- **`ui-smoke` deferred** — confirm keep-out vs include during review.
- **Spec language** — written in English to match the repo's other engineering docs (AGENTS.md, README); say so if pt-BR is preferred.
