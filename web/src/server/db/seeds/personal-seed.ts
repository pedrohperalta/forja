const PERSONAL_SEED_SQL = `
insert into users (id, email, name, created_at, updated_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'dev@example.com',
  'Forja Dev',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
)
on conflict (id) do nothing;

insert into plans (id, user_id, label, created_at, updated_at)
values (
  'seed_plan_a',
  '00000000-0000-4000-8000-000000000001',
  'A',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
)
on conflict (id) do nothing;
`

export function personalSeedSql(): string {
  return PERSONAL_SEED_SQL.trim()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(personalSeedSql())
}
