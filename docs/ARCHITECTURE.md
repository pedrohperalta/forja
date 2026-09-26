# Architecture & Tech Stack — Forja

> Architecture / tech-stack reference for the Forja workspace.

Forja is a **pnpm monorepo**:

- `web/` (`@forja/web`) — Next.js 16 admin + sync/auth API consumed by mobile
  clients (the mobile app lives in a separate repository); its layering and
  conventions live in [`../web/AGENTS.md`](../web/AGENTS.md).
- `packages/domain/` (`@forja/domain`) — shared Zod schemas / domain types.

## Languages

| Language   | Version | Usage            |
| ---------- | ------- | ---------------- |
| TypeScript | 5.8+    | Primary language |

## Core Frameworks

| Layer       | Technology                   | Version | Notes                                             |
| ----------- | ---------------------------- | ------- | ------------------------------------------------- |
| Web app     | Next.js (App Router)         | 16      | React 19.2, server components + route handlers     |
| Database    | PostgreSQL + Drizzle ORM     | latest  | Drizzle Kit for migrations                         |
| Validation  | Zod                          | 4.x     | Shared schemas via `@forja/domain`                 |
| State (web) | React server components      | —       | No client state library; server-first data flow    |

## Architecture

### Layering (`@forja/web`)

Requests flow in one direction, enforced by ESLint:

```
route handler (src/app/api/**/route.ts)
  -> service   (src/server/services/**)
  -> repository (src/server/repositories/**)
  -> db        (src/server/db)
```

- **Route handlers** authenticate, validate input, call services, and shape
  the HTTP response.
- **Services** hold business logic and are the only callers of repositories.
- **Repositories** are thin, per-entity Drizzle query modules.

### API surface

- `/admin` — admin web app (plans, workouts, equipment photos, imports).
- `/api/mobile/v1/**` — auth (Google OAuth exchange, refresh rotation),
  sync (pull/push, workout sessions), and equipment photo endpoints consumed
  by the mobile clients.

### Shared domain (`@forja/domain`)

Zod schemas and derived types shared between the web app and its API:
plans, workout sessions, sync contracts, auth responses, equipment photos,
and admin import contracts.

## Infrastructure / Deployment

- **Local**: Docker Compose (`deploy/forja/`) with Postgres + web + nginx.
- **Production**: Docker images deployed via Compose behind nginx.

## Testing Stack

| Layer             | Tool                                        |
| ----------------- | ------------------------------------------- |
| Unit / component  | Vitest (jsdom for component tests)          |
| Integration       | Vitest against real Postgres (`pnpm test:db`) |

## Code Quality Tools

| Tool                   | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| ESLint (flat config)   | Linting + layering enforcement             |
| Prettier               | Auto-formatting                            |
| Lefthook               | Git hooks (faster than Husky, Go binary)   |
| Zod                    | Runtime validation at API boundaries       |
| TypeScript strict      | `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |

## References

- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Zod](https://zod.dev)
- [Vitest](https://vitest.dev)
