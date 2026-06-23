# @forja/web

Next.js 16 admin app and mobile sync/auth API for Forja. Drizzle ORM + Postgres.

> Conventions for working in this package live in [`AGENTS.md`](./AGENTS.md).

## Setup

From the repo root (pnpm workspace):

```bash
pnpm install            # also builds @forja/domain via its prepare script
cp web/.env.example web/.env.local   # then fill in real values
```

`src/server/env.ts` validates every variable in `.env.local` at runtime; see
[`.env.example`](./.env.example) for the full list and how to generate secrets.

### Local Postgres

A throwaway local database is provided by the deploy compose file (exposed on
`127.0.0.1:55432`):

```bash
docker compose -f deploy/forja/compose.local.yml up -d
```

Point `DATABASE_URL` at it, e.g. `postgres://forja:forja@localhost:55432/forja`.
The schema is applied by `migrateDatabase()` (`src/server/db/migrate.ts`, run
on app/seed startup); integration tests provision their own database via
`src/server/db/testDatabase.ts`.

## Commands

Run from `web/` (or via `pnpm --filter @forja/web <script>` from the root):

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` | Unit tests (Vitest) — integration tests excluded |
| `pnpm test:db` | Integration tests (`*.integration.test.ts`) — **needs Postgres** |
| `pnpm coverage` | Unit tests with v8 coverage (floor enforced; see vitest.config.ts) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | ESLint |
| `pnpm db:seed:personal` | Seed a personal dataset |

## Gate

There is no CI. The authoritative gate is local: `pnpm verify` (from the root —
build domain, typecheck, lint, unit tests for every package) runs automatically
on `git push` via the lefthook `pre-push` hook.
