import { mkdtemp, readFile, rm, stat, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateImportSql,
  loadExportArtifact,
  runDryRun,
  validateExportArtifact,
  writeJson,
} from './lib.mjs'

test('validates a good export artifact', async () => {
  const exportDir = await createExportDir()

  const artifact = await loadExportArtifact(exportDir)
  const report = await validateExportArtifact(artifact, { exportDir })

  assert.equal(report.ready, true)
  assert.equal(report.counts.users.valid, 1)
  assert.equal(report.counts.plans.valid, 1)
  assert.equal(report.counts.workoutSessions.valid, 1)
  assert.equal(report.counts.photos.valid, 1)

  await rm(exportDir, { recursive: true, force: true })
})

test('reports invalid plan payloads with the source plan ID', async () => {
  const exportDir = await createExportDir()
  const plansPath = join(exportDir, 'plans.json')
  const plans = JSON.parse(await readFile(plansPath, 'utf8'))
  plans[0].data = { id: 'plan_a', label: 'A' }
  await writeJson(plansPath, plans)

  const report = await validateExportArtifact(await loadExportArtifact(exportDir), {
    exportDir,
  })

  assert.equal(report.ready, false)
  assert.equal(report.counts.plans.invalid, 1)
  assert.match(report.errors[0], /plan_a/)

  await rm(exportDir, { recursive: true, force: true })
})

test('reports missing photo files', async () => {
  const exportDir = await createExportDir({ writePhotoFile: false })
  const report = await validateExportArtifact(await loadExportArtifact(exportDir), {
    exportDir,
  })

  assert.equal(report.ready, false)
  assert.equal(report.counts.photos.invalid, 1)
  assert.match(report.errors[0], /equipment-photos\/user-1\/supino-reto.jpg/)

  await rm(exportDir, { recursive: true, force: true })
})

test('dry-run validates export data without writing import SQL', async () => {
  const exportDir = await createExportDir()
  const report = await runDryRun({ exportDir })

  assert.equal(report.ready, true)
  await assert.rejects(stat(join(exportDir, 'import-forja.sql')))

  await rm(exportDir, { recursive: true, force: true })
})

test('generates deterministic SQL that preserves exported IDs', async () => {
  const exportDir = await createExportDir()
  const sqlPath = join(exportDir, 'import-forja.sql')
  const sql = await generateImportSql({ exportDir, outputPath: sqlPath })

  assert.match(sql, /^begin;/)
  assert.match(sql, /commit;\s*$/)
  assert.match(sql, /'00000000-0000-4000-8000-000000000001'/)
  assert.match(sql, /'plan_a'/)
  assert.match(sql, /'session_1'/)
  assert.match(sql, /'equipment-photos\/user-1\/supino-reto.jpg'/)
  assert.equal(await readFile(sqlPath, 'utf8'), sql)

  await rm(exportDir, { recursive: true, force: true })
})

async function createExportDir(options = {}) {
  const exportDir = await mkdtemp(join(tmpdir(), 'forja-export-'))
  const filesDir = join(exportDir, 'files', 'equipment-photos', 'user-1')
  await mkdir(filesDir, { recursive: true })

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
  await writeJson(join(exportDir, 'oauth-accounts.json'), [
    {
      id: '00000000-0000-4000-8000-000000000101',
      userId: '00000000-0000-4000-8000-000000000001',
      provider: 'google',
      providerAccountId: 'google-user-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ])
  await writeJson(join(exportDir, 'plans.json'), [
    {
      id: 'plan_a',
      userId: '00000000-0000-4000-8000-000000000001',
      label: 'A',
      data: validPlan(),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
    },
  ])
  await writeJson(join(exportDir, 'workout-sessions.json'), [
    {
      id: 'session_1',
      userId: '00000000-0000-4000-8000-000000000001',
      data: validWorkoutSession(),
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

  if (options.writePhotoFile !== false) {
    await writeFile(join(filesDir, 'supino-reto.jpg'), Buffer.from([0xff, 0xd8, 0xff, 0xdb]))
  }

  return exportDir
}

function validPlan() {
  return {
    id: 'plan_a',
    label: 'A',
    name: 'Treino A',
    focus: 'Peito',
    exercises: [
      {
        id: 'supino-reto',
        name: 'Supino Reto',
        category: 'Peito',
        equipment: 'Barra',
        reps: '10-12',
        sets: 3,
        restSeconds: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }
}

function validWorkoutSession() {
  return {
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
  }
}
