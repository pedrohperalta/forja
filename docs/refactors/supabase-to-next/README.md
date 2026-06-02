# Supabase to Next.js Refactor

This folder is the execution dossier for replacing Supabase with a self-hosted Next.js admin + backend.

Read in order:

1. [`00-context.md`](./00-context.md)
2. [`01-decisions.md`](./01-decisions.md)
3. [`02-api-contract.md`](./02-api-contract.md)
4. [`03-data-model.md`](./03-data-model.md)
5. [`04-migration-plan.md`](./04-migration-plan.md)
6. [`05-implementation-slices.md`](./05-implementation-slices.md)
7. [`06-validation-checklist.md`](./06-validation-checklist.md)
8. [`07-autonomous-runbook.md`](./07-autonomous-runbook.md)
9. [`08-codex-prompts.md`](./08-codex-prompts.md)

For implementation, use `05-implementation-slices.md` as the task queue. Start with Slice 0, which moves the Expo app into `mobile/`. Each slice is intended to be small enough for an autonomous Codex run with tests first, explicit allowed files, and a clear done condition.

Use `07-autonomous-runbook.md` as the operating procedure for each autonomous implementation session.
Use `08-codex-prompts.md` when starting a specific implementation slice.

Do not remove Supabase runtime dependencies until the replacements for auth, sync, and photos are implemented and verified, and mobile AI import has been removed or disabled. AI import remains admin-web only in v1.

## Ready-To-Implement Rules

- Work on branch `track/supabase-to-next`.
- Implement slices in order.
- Use `pnpm` workspaces.
- Use Node.js 24 LTS and PostgreSQL 18.
- Keep tests first for every behavioral change.
- Keep production secrets out of Git.
- Do not push to `main` without explicit owner confirmation.

## Canonical Checks

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @forja/web build
```

Before cutover, also complete the migration dry-run and the full checklist in `06-validation-checklist.md`.

## Next Action

The next implementation task is Slice 0:

```text
Move Expo App To Mobile Workspace
```

Use the Slice 0 prompt in `08-codex-prompts.md`.
