import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  PlanSchema,
  WorkoutSessionSchema,
} from '../../packages/domain/dist/index.js'

const EXPORT_FILES = {
  users: 'users.json',
  oauthAccounts: 'oauth-accounts.json',
  plans: 'plans.json',
  workoutSessions: 'workout-sessions.json',
  photos: 'equipment-photos.json',
}

export async function loadExportArtifact(exportDir) {
  return {
    users: await readJsonArray(join(exportDir, EXPORT_FILES.users)),
    oauthAccounts: await readJsonArray(join(exportDir, EXPORT_FILES.oauthAccounts)),
    plans: await readJsonArray(join(exportDir, EXPORT_FILES.plans)),
    workoutSessions: await readJsonArray(join(exportDir, EXPORT_FILES.workoutSessions)),
    photos: await readJsonArray(join(exportDir, EXPORT_FILES.photos)),
  }
}

export async function validateExportArtifact(artifact, { exportDir }) {
  const errors = []
  const counts = {
    users: countBucket(),
    oauthAccounts: countBucket(),
    plans: countBucket(),
    workoutSessions: countBucket(),
    photos: countBucket(),
  }

  for (const user of artifact.users) {
    recordValidation(counts.users, errors, validateUser(user), user.id ?? 'unknown user')
  }

  for (const account of artifact.oauthAccounts) {
    recordValidation(
      counts.oauthAccounts,
      errors,
      validateOauthAccount(account),
      account.id ?? account.providerAccountId ?? 'unknown oauth account',
    )
  }

  for (const plan of artifact.plans) {
    const result = validatePlan(plan)
    recordValidation(counts.plans, errors, result, plan.id ?? 'unknown plan')
  }

  for (const session of artifact.workoutSessions) {
    const result = validateWorkoutSession(session)
    recordValidation(
      counts.workoutSessions,
      errors,
      result,
      session.id ?? 'unknown workout session',
    )
  }

  for (const photo of artifact.photos) {
    const result = await validatePhoto(photo, exportDir)
    recordValidation(
      counts.photos,
      errors,
      result,
      photo.path ?? `${photo.userId}/${photo.exerciseId}`,
    )
  }

  return {
    ready: errors.length === 0,
    counts,
    errors,
  }
}

export async function runDryRun({ exportDir }) {
  const artifact = await loadExportArtifact(exportDir)
  return validateExportArtifact(artifact, { exportDir })
}

export async function generateImportSql({ exportDir, outputPath = null }) {
  const artifact = await loadExportArtifact(exportDir)
  const report = await validateExportArtifact(artifact, { exportDir })

  if (!report.ready) {
    throw new Error(`Export artifact is invalid:\n${report.errors.join('\n')}`)
  }

  const sql = buildImportSql(artifact)
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, sql)
  }

  return sql
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function formatReport(report) {
  return [
    formatCount('Users', report.counts.users),
    formatCount('OAuth accounts', report.counts.oauthAccounts),
    formatCount('Plans', report.counts.plans),
    formatCount('Workout sessions', report.counts.workoutSessions),
    formatCount('Photos', report.counts.photos),
    `Ready to import: ${report.ready ? 'yes' : 'no'}`,
    ...report.errors.map((error) => `Error: ${error}`),
  ].join('\n')
}

function buildImportSql(artifact) {
  const statements = ['begin;']

  for (const user of artifact.users) {
    statements.push(
      insertStatement('users', {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        avatar_url: user.avatarUrl ?? null,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      }),
    )
  }

  for (const account of artifact.oauthAccounts) {
    statements.push(
      insertStatement('oauth_accounts', {
        id: account.id,
        user_id: account.userId,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        created_at: account.createdAt,
        updated_at: account.updatedAt,
      }),
    )
  }

  for (const plan of artifact.plans) {
    const deletedAt = plan.deletedAt ?? null
    statements.push(
      insertStatement('plans', {
        id: plan.id,
        user_id: plan.userId,
        label: plan.label ?? plan.data.label,
        archived_at: deletedAt,
        created_at: plan.createdAt,
        updated_at: plan.updatedAt,
      }),
    )
    statements.push(
      insertStatement('plan_drafts', {
        plan_id: plan.id,
        user_id: plan.userId,
        data: jsonValue(plan.data),
        updated_at: plan.updatedAt,
      }),
    )

    if (deletedAt) {
      statements.push(
        insertStatement('plan_tombstones', {
          plan_id: plan.id,
          user_id: plan.userId,
          deleted_at: deletedAt,
        }),
      )
    } else {
      statements.push(
        insertStatement('plan_revisions', {
          plan_id: plan.id,
          user_id: plan.userId,
          revision_number: 1,
          data: jsonValue(plan.data),
          published_at: plan.updatedAt,
          created_at: plan.updatedAt,
        }),
      )
    }
  }

  for (const session of artifact.workoutSessions) {
    statements.push(
      insertStatement('workout_sessions', {
        id: session.id,
        user_id: session.userId,
        data: jsonValue(session.data),
        updated_at: session.updatedAt,
        deleted_at: session.deletedAt ?? null,
        created_at: session.createdAt,
      }),
    )
  }

  for (const photo of artifact.photos) {
    statements.push(
      insertStatement('equipment_photos', {
        user_id: photo.userId,
        exercise_id: photo.exerciseId,
        path: photo.path,
        content_type: photo.contentType,
        byte_size: photo.byteSize,
        updated_at: photo.updatedAt,
        created_at: photo.createdAt,
        deleted_at: photo.deletedAt ?? null,
      }),
    )
  }

  statements.push('commit;')
  return `${statements.join('\n')}\n`
}

function insertStatement(table, values) {
  const columns = Object.keys(values)
  const sqlValues = columns.map((column) => sqlLiteral(values[column]))
  return `insert into ${table} (${columns.join(', ')}) values (${sqlValues.join(', ')});`
}

function jsonValue(value) {
  return { type: 'json', value }
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object' && value.type === 'json') {
    return `${sqlString(JSON.stringify(value.value))}::jsonb`
  }

  return sqlString(String(value))
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`
}

async function readJsonArray(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON array`)
  }

  return parsed
}

function validateUser(user) {
  if (!isRecord(user) || !isString(user.id) || !isString(user.email)) {
    return 'user must include id and email'
  }

  return null
}

function validateOauthAccount(account) {
  if (
    !isRecord(account) ||
    !isString(account.id) ||
    !isString(account.userId) ||
    !isString(account.provider) ||
    !isString(account.providerAccountId)
  ) {
    return 'oauth account must include id, userId, provider, and providerAccountId'
  }

  return null
}

function validatePlan(plan) {
  if (!isRecord(plan) || !isString(plan.id) || !isString(plan.userId)) {
    return 'plan must include id and userId'
  }

  const result = PlanSchema.safeParse(plan.data)
  return result.success ? null : result.error.message
}

function validateWorkoutSession(session) {
  if (!isRecord(session) || !isString(session.id) || !isString(session.userId)) {
    return 'workout session must include id and userId'
  }

  const result = WorkoutSessionSchema.safeParse(session.data)
  return result.success ? null : result.error.message
}

async function validatePhoto(photo, exportDir) {
  if (
    !isRecord(photo) ||
    !isString(photo.userId) ||
    !isString(photo.exerciseId) ||
    !isString(photo.path) ||
    !isString(photo.contentType) ||
    typeof photo.byteSize !== 'number'
  ) {
    return 'photo must include userId, exerciseId, path, contentType, and byteSize'
  }

  try {
    await stat(join(exportDir, 'files', photo.path))
    return null
  } catch {
    return `missing photo file: ${photo.path}`
  }
}

function recordValidation(bucket, errors, error, id) {
  if (error) {
    bucket.invalid += 1
    errors.push(`${id}: ${error}`)
    return
  }

  bucket.valid += 1
}

function countBucket() {
  return { valid: 0, invalid: 0 }
}

function formatCount(label, count) {
  return `${label}: ${count.valid} valid, ${count.invalid} invalid`
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value) {
  return typeof value === 'string' && value.length > 0
}
