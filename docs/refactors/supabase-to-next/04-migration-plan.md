# Supabase to Next.js Refactor — Migration Plan

## Goal

Move all existing Supabase-backed data into the self-hosted Next.js/PostgreSQL backend without breaking mobile users or losing history/photos.

This migration happens once at the end of the refactor. There is no feature-by-feature production cutover.

The current database is small, so the preferred migration artifact can be a generated `.sql` file that inserts/transforms the existing Supabase data into the new PostgreSQL schema. The SQL file should be generated and reviewed locally during migration.

Because this is a personal app with one owner/user, real workout data may be used for development seeds and fixtures. Secrets, OAuth tokens, refresh tokens, cookies, service-role keys, API keys, and real `.env` files must still never be committed. Raw `.migration/` exports stay ignored; any committed seed should be an intentional, reviewed artifact.

## Migration Requirements

- Preserve user IDs.
- Preserve plan IDs.
- Preserve workout session IDs.
- Preserve timestamps where available.
- Preserve equipment photo path compatibility.
- Support dry-run mode.
- Validate all exported data with `packages/domain` schemas before import.
- Keep Supabase available until production verification is complete.
- Prefer Supabase MCP for export/introspection when available.

## Export Sources

Preferred export path:

- use the Supabase MCP for schema/data/storage introspection and export when available
- configured MCP server name: `supabase`
- configured project ref: `hqvfuwvoureadcwrlkwn`
- configured mode: project-scoped, read-only
- configured URL: `https://mcp.supabase.com/mcp?project_ref=hqvfuwvoureadcwrlkwn&read_only=true`
- configured auth storage: macOS Keychain item `codex-supabase-mcp`
- configured wrapper: `/Users/pedrohperalta/.local/bin/codex-supabase-mcp-proxy`

Fallback export path:

- use explicit scripts with Supabase service-role credentials

### Supabase Auth

Required fields:

- user ID
- email
- display name if available
- Google provider account ID if available
- created timestamp

### Supabase Tables

`plans`:

- `id`
- `user_id`
- `data`
- `updated_at`
- `deleted_at`
- `created_at`

`workout_sessions`:

- `id`
- `user_id`
- `data`
- `updated_at`
- `created_at`

### Supabase Storage

Bucket:

```text
equipment-photos
```

Current path:

```text
{userId}/{exerciseId}.jpg
```

Target relative path:

```text
equipment-photos/{userId}/{exerciseId}.jpg
```

## Migration Scripts

Recommended scripts:

```text
scripts/migration/export-supabase.ts
scripts/migration/validate-export.ts
scripts/migration/import-next-backend.ts
scripts/migration/download-supabase-photos.ts
scripts/migration/generate-import-sql.ts
```

Keep migration scripts in `scripts/migration/` so autonomous implementation tasks can rely on stable paths. Keep the responsibilities separate.

## Export Artifact

Create a local export folder:

```text
.migration/supabase-export/
  users.json
  oauth-accounts.json
  plans.json
  workout-sessions.json
  equipment-photos.json
  import-forja.sql
  files/
    equipment-photos/
      {userId}/
        {exerciseId}.jpg
```

Do not commit `.migration/`. If a development seed is useful, generate it as a separate reviewed artifact outside `.migration/` and make sure it contains no secrets or live auth material.

## SQL Artifact Strategy

Because the production data set is expected to stay small for the first migration, generate a deterministic SQL import file:

```text
.migration/supabase-export/import-forja.sql
```

The SQL file should:

- run inside a single transaction
- insert users into `users`
- insert OAuth account links when available
- insert plans into `plans`
- insert current plan JSON into `plan_drafts`
- insert one published revision per active plan into `plan_revisions`
- insert deleted/archived plan tombstones into `plan_tombstones`
- insert workout history into `workout_sessions`
- insert equipment photo metadata into `equipment_photos`
- preserve IDs and timestamps
- be safe to run against an empty target database
- finish by reporting/import-enabling deterministic verification counts when practical

The SQL file should not:

- create application schema tables
- contain secrets
- be committed to Git
- be the only validation step

Schema creation remains owned by versioned migrations in `web`. Data import is owned by the generated SQL artifact.

If any target schema or mapping changes after `import-forja.sql` is generated, regenerate the SQL artifact before staging or production import.

## Dry Run

Dry-run mode must:

- read all export artifacts
- validate every JSON payload
- validate file references
- report counts by entity type
- report invalid rows with IDs and reasons
- perform no writes to production database
- perform no writes to production upload volume
- generate `import-forja.sql` locally for review when source data is valid

Expected output shape:

```text
Users: 1 valid, 0 invalid
Plans: 12 valid, 0 invalid
Workout sessions: 140 valid, 0 invalid
Photos: 18 valid, 0 invalid
Ready to import: yes
```

## Import Steps

1. Stop writes to the Supabase-backed production app by not using the mobile app during the cutover window.
2. Export Supabase auth users.
3. Export Supabase tables.
4. Download Supabase Storage photos.
5. Run export validation.
6. Generate `.migration/supabase-export/import-forja.sql`.
7. Start local or staging Postgres.
8. Apply application schema migrations.
9. Run generated SQL import into staging.
10. Verify counts.
11. Run mobile smoke test against staging backend.
12. Run admin smoke test against staging backend.
13. Backup production VPS database and uploads volume.
14. Apply application schema migrations in production.
15. Run generated SQL import against production.
16. Run production verification queries and compare counts with export summary.
17. Point the mobile build in `mobile/` to `EXPO_PUBLIC_FORJA_API_URL`.
18. Keep Supabase untouched until production smoke tests pass.
19. Remove Supabase runtime dependency after cutover is verified.

## Recovery And Fix-Forward

This project does not require a formal app rollback flow in v1.

Before final cutover:

- continue using the Supabase-backed mobile app
- discard and recreate staging/prod import attempts if validation fails

After final cutover:

- fix application issues with a new commit, pull on the VPS, rebuild, and restart the stack
- restore latest VPS database backup only for data-loss scenarios
- restore uploads backup only for media-loss scenarios
- keep the final Supabase export archived securely for at least one release cycle

## Verification Queries

Before accepting migration:

- every Supabase user exists in `users`
- every Supabase plan exists in `plans`
- every non-deleted Supabase plan has a draft and published revision
- every deleted Supabase plan has a tombstone
- every Supabase workout session exists in `workout_sessions`
- every downloaded photo has an `equipment_photos` row
- every `equipment_photos.path` exists on disk
- generated `import-forja.sql` can be applied to an empty migrated database
- production import counts match `.migration/supabase-export/summary.json`

## Production Cutover Checklist

- [ ] Supabase export completed
- [ ] Supabase MCP export attempted or fallback service-role export used
- [ ] Export validation passed
- [ ] `import-forja.sql` generated and reviewed locally
- [ ] `import-forja.sql` runs inside a single transaction
- [ ] VPS database migrated
- [ ] VPS uploads copied
- [ ] Production import counts match export summary
- [ ] Backups configured
- [ ] Daily database and uploads backups retain 14 days in `forja_backups`
- [ ] Admin login works
- [ ] Admin published plans visible
- [ ] Mobile login works
- [ ] Mobile sync pull works
- [ ] Mobile workout session push works
- [ ] Mobile photo upload/restore works
- [ ] Mobile has no AI import runtime dependency
- [ ] Admin AI import works
- [ ] Supabase left intact for rollback window
