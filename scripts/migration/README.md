# Supabase Migration Scripts

Local export artifacts live in `.migration/supabase-export/` and are ignored by Git.

Validate without writing:

```sh
node scripts/migration/import-next-backend.mjs --dry-run .migration/supabase-export
```

Generate the reviewed SQL artifact:

```sh
node scripts/migration/generate-import-sql.mjs .migration/supabase-export
```

The generated file is `.migration/supabase-export/import-forja.sql`. It is transactional and should be applied only after the application schema migration.

Personal seed command:

```sh
pnpm --filter @forja/web db:seed:personal
```
