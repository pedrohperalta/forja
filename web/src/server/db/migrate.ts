import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type postgres from 'postgres'

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  'migrations',
)

export async function migrateDatabase(client: postgres.Sql): Promise<void> {
  const migration = await readFile(join(MIGRATIONS_DIR, '0000_initial.sql'), 'utf8')

  await client`select pg_advisory_lock(42424242)`
  try {
    await client.unsafe(migration)
  } finally {
    await client`select pg_advisory_unlock(42424242)`
  }
}
