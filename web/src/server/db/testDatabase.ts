import type postgres from 'postgres'

export function assertTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('TEST_DATABASE_URL is required for repository tests')
  }

  const parsed = new URL(databaseUrl)
  const databaseName = parsed.pathname.replace(/^\//, '')

  if (databaseName !== 'forja_test') {
    throw new Error('TEST_DATABASE_URL must point to database forja_test')
  }

  return databaseUrl
}

export async function resetDatabase(client: postgres.Sql): Promise<void> {
  await client`
    truncate table
      import_jobs,
      equipment_photos,
      workout_sessions,
      plan_tombstones,
      plan_revisions,
      plan_drafts,
      plans,
      mobile_auth_codes,
      admin_sessions,
      refresh_tokens,
      oauth_accounts,
      users
    restart identity cascade
  `
}
