import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { generateImportSql, writeJson } from './lib.mjs'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

test('generated SQL applies to an empty migrated test database', { skip: !TEST_DATABASE_URL }, async () => {
  assert.match(new URL(TEST_DATABASE_URL).pathname, /forja_test$/)

  const postgres = (await import('../../web/node_modules/postgres/src/index.js')).default
  const sql = postgres(TEST_DATABASE_URL, { max: 1 })
  const exportDir = await createExportDir()

  try {
    await sql.unsafe('drop schema public cascade; create schema public;')
    await sql.unsafe(await readMigrationSql())
    await sql.unsafe(await generateImportSql({ exportDir }))

    const users = await sql`select id::text from users`
    const plans = await sql`select id from plans`
    const sessions = await sql`select id from workout_sessions`

    assert.equal(users[0].id, '00000000-0000-4000-8000-000000000001')
    assert.equal(plans[0].id, 'plan_a')
    assert.equal(sessions[0].id, 'session_1')
  } finally {
    await sql.end()
    await rm(exportDir, { recursive: true, force: true })
  }
})

async function readMigrationSql() {
  return await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../../web/src/server/db/migrations/0000_initial.sql', import.meta.url), 'utf8'),
  )
}

async function createExportDir() {
  const exportDir = await mkdtemp(join(tmpdir(), 'forja-export-db-'))
  await mkdir(join(exportDir, 'files', 'equipment-photos', 'user-1'), { recursive: true })
  await writeFile(
    join(exportDir, 'files', 'equipment-photos', 'user-1', 'supino-reto.jpg'),
    Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
  )

  await writeJson(join(exportDir, 'users.json'), [
    {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  await writeJson(join(exportDir, 'oauth-accounts.json'), [])
  await writeJson(join(exportDir, 'plans.json'), [
    {
      id: 'plan_a',
      userId: '00000000-0000-4000-8000-000000000001',
      label: 'A',
      data: {
        id: 'plan_a',
        label: 'A',
        name: 'Treino A',
        focus: 'Peito',
        exercises: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
    },
  ])
  await writeJson(join(exportDir, 'workout-sessions.json'), [
    {
      id: 'session_1',
      userId: '00000000-0000-4000-8000-000000000001',
      data: {
        id: 'session_1',
        planId: 'plan_a',
        planName: 'Treino A',
        planLabel: 'A',
        focus: 'Peito',
        date: '2026-01-03T00:00:00.000Z',
        durationMinutes: 45,
        exercises: [{ name: 'Supino Reto', sets: 3, weight: 80 }],
        syncStatus: 'synced',
        version: 1,
        createdAt: '2026-01-03T00:00:00.000Z',
        updatedAt: '2026-01-03T01:00:00.000Z',
      },
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T01:00:00.000Z',
      deletedAt: null,
    },
  ])
  await writeJson(join(exportDir, 'equipment-photos.json'), [
    {
      userId: '00000000-0000-4000-8000-000000000001',
      exerciseId: 'supino-reto',
      path: 'equipment-photos/user-1/supino-reto.jpg',
      contentType: 'image/jpeg',
      byteSize: 4,
      createdAt: '2026-01-04T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      deletedAt: null,
    },
  ])

  return exportDir
}
