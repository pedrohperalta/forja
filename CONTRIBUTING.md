# Contributing — Forja

Forja is a pnpm monorepo: `web/` (Next.js admin + sync/auth API for mobile
clients) and `packages/domain/` (shared Zod schemas). Development follows the
**superpowers** loop — brainstorming → writing-plans → implementation (TDD) →
finishing-a-development-branch. See [`docs/engineering/index.html`](docs/engineering/index.html)
for the end-to-end flow.

## TDD Policy

**Strict** — tests are required before implementation.

- Write failing tests first, then implement to make them pass
- Every task must have corresponding test coverage
- No implementation code without a preceding test

## Commit Strategy

**Conventional Commits** with descriptive scopes.

### Branch Strategy

- Work on a feature branch named `track/<name>` (e.g. `track/rest-timer`)
- Commit freely to the branch during development
- Merge into `main` only when the work is complete and green
- **Never push to `main` without explicit confirmation**

```
feat(workout): add rest timer with SVG arc animation
fix(home): correct next workout chip logic
test(store): add workoutStore persistence tests
refactor(navigation): simplify exercise flow routing
```

### Commit Types

| Type       | Usage                                    |
| ---------- | ---------------------------------------- |
| `feat`     | New feature                              |
| `fix`      | Bug fix                                  |
| `test`     | Adding or updating tests                 |
| `refactor` | Code change without feature/fix          |
| `docs`     | Documentation changes                    |
| `chore`    | Build, config, tooling                   |
| `style`    | Formatting, whitespace (no logic change) |

## Quality gates (local)

There is no CI — the gates run locally via lefthook.

- **pre-commit**: ESLint + Prettier (re-staged) + `pnpm typecheck` + commitlint
- **pre-push (authoritative)**: `pnpm verify` — build `@forja/domain`, then typecheck,
  lint, and unit tests across every package. A failure blocks the push.

Integration tests (`*.integration.test.ts`) need Postgres and run on demand via
`pnpm --filter @forja/web test:db` (kept out of the gate so it can't flake).

## Language Rules

- **Docs**: English
- **Code & comments**: English
- **UI text**: Portuguese (pt-BR)
