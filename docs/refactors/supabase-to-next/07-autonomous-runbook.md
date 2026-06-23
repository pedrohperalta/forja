# Supabase to Next.js Refactor — Autonomous Runbook

Use this runbook when starting an autonomous implementation session for this refactor.

## Required Reading Order

Before editing code, read:

1. `AGENTS.md`
2. `docs/ARCHITECTURE.md`
3. `docs/styleguides/typescript.md`
4. `CONTRIBUTING.md`
5. `docs/refactors/supabase-to-next/README.md`
6. `docs/refactors/supabase-to-next/01-decisions.md`
7. `docs/refactors/supabase-to-next/02-api-contract.md`
8. `docs/refactors/supabase-to-next/03-data-model.md`
9. `docs/refactors/supabase-to-next/05-implementation-slices.md`
10. `docs/refactors/supabase-to-next/06-validation-checklist.md`

Read `04-migration-plan.md` before starting migration, seed, deploy, or cutover work.

## Branch And Safety

- Work on `track/supabase-to-next`.
- Do not push to `main`.
- Before each slice, run `git status --short`.
- Do not revert unrelated user changes.
- If existing local changes touch the same files as the slice, inspect them and work with them.
- If a slice cannot be completed without overwriting unrelated work, stop and report the blocker.

## Slice Execution Loop

For each slice:

1. Read the slice goal, allowed files, must-not-change list, tests-first list, and done criteria.
2. Inspect current code paths related to the slice.
3. Add or update failing tests first.
4. Implement only the required behavior.
5. Run the smallest relevant test command.
6. Run package-level typecheck/lint when the slice touches TypeScript.
7. Update docs only when the implementation changes a documented decision or command.
8. Stop after the slice is done; do not begin the next slice unless explicitly asked.

## Stop Conditions

Stop and ask for owner direction only when:

- a required secret or external account value is missing and cannot be stubbed safely
- the current repo state conflicts with the slice in a way that would require overwriting unrelated work
- a documented decision is technically impossible
- a migration validation result shows data loss or an unresolvable schema mismatch
- production deploy/cutover would require pushing to `main` or changing live DNS/secrets without explicit approval

Do not stop for ordinary implementation choices already covered by `01-decisions.md`.

## Canonical Commands

Workspace:

```sh
pnpm test
pnpm typecheck
pnpm lint
```

Mobile:

```sh
pnpm --filter @forja/mobile test
pnpm --filter @forja/mobile typecheck
pnpm --filter @forja/mobile lint
```

Web:

```sh
pnpm --filter @forja/web test
pnpm --filter @forja/web typecheck
pnpm --filter @forja/web build
```

Domain:

```sh
pnpm --filter @forja/domain test
pnpm --filter @forja/domain typecheck
```

Database:

```sh
pnpm --filter @forja/web db:migrate
pnpm --filter @forja/web db:seed:personal
```

## Deployment Runbook

Production deploy is SSH/build-on-VPS, not registry-based.

VPS checkout:

```text
/root/projects/forja
```

Preflight:

```sh
ssh phperalta.me 'cd /root/projects/forja && git -c safe.directory=/root/projects/forja status --short --branch'
```

Deployment docs under `deploy/forja/README.md` must include:

- preflight status check
- pull/update command
- Docker image build command on the VPS
- `pnpm --filter @forja/web db:migrate`
- Portainer stack update/restart steps
- `GET https://forja.phperalta.me/api/health`
- fix-forward recovery steps
- backup and restore commands

## Final Cutover Guardrail

Do not perform final cutover until all of these are true:

- `06-validation-checklist.md` final cutover criteria are satisfied
- production database backup exists
- uploads backup exists
- migration dry-run passed
- production import counts match export summary
- owner explicitly approves cutover
