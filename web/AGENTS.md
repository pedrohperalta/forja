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
