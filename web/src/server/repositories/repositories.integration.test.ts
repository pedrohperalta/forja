import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import type { Plan, WorkoutSession } from '@forja/domain'
import { assertTestDatabaseUrl, resetDatabase } from '../db/testDatabase'
import { migrateDatabase } from '../db/migrate'
import * as schema from '../db/schema'
import {
  createAdminSession,
  createImportJob,
  createMobileAuthCode,
  createOrUpdateEquipmentPhoto,
  createPlanDraft,
  createPlanTombstone,
  createRefreshToken,
  createUser,
  findOAuthAccount,
  findUserByEmail,
  findUserById,
  linkOAuthAccount,
  publishPlanRevision,
  revokeAdminSession,
  revokeRefreshToken,
  upsertWorkoutSession,
  useMobileAuthCode,
} from './index'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const NOW = new Date('2026-05-18T12:00:00.000Z')
const LATER = new Date('2026-05-18T13:00:00.000Z')
const USER_ID = '0a9d699f-c75f-4a55-a924-79a607f2f420'

const planData = {
  id: 'plan_a',
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros / Tríceps',
  exercises: [
    {
      id: 'exercise_1',
      name: 'Supino Reto',
      category: 'Peito',
      equipment: 'Barra',
      reps: '10-12',
      sets: 3,
      restSeconds: 60,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    },
  ],
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
} satisfies Plan

const workoutSessionData = {
  id: 'session_1',
  planId: 'plan_a',
  planName: 'Treino A',
  planLabel: 'A',
  focus: 'Peito / Ombros / Tríceps',
  date: NOW.toISOString(),
  durationMinutes: 42,
  exercises: [{ name: 'Supino Reto', sets: 3, weight: 80 }],
  syncStatus: 'pending',
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
} satisfies WorkoutSession

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('repositories', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
  })

  afterAll(async () => {
    await client.end()
  })

  it('creates and finds a user while preserving explicit user IDs', async () => {
    const user = await createUser(db, {
      id: USER_ID,
      email: 'user@example.com',
      name: 'User',
      avatarUrl: 'https://example.com/avatar.jpg',
      now: NOW,
    })

    expect(user.id).toBe(USER_ID)
    await expect(findUserByEmail(db, 'user@example.com')).resolves.toMatchObject(
      { id: USER_ID },
    )
    await expect(findUserById(db, USER_ID)).resolves.toMatchObject({
      email: 'user@example.com',
    })
  })

  it('links an OAuth account', async () => {
    await seedUser()

    const account = await linkOAuthAccount(db, {
      userId: USER_ID,
      provider: 'google',
      providerAccountId: 'google-user-id',
      now: NOW,
    })

    expect(account.userId).toBe(USER_ID)
    await expect(
      findOAuthAccount(db, 'google', 'google-user-id'),
    ).resolves.toMatchObject({ userId: USER_ID })
  })

  it('creates a plan draft and publishes immutable revisions', async () => {
    await seedUser()

    const draft = await createPlanDraft(db, {
      planId: 'plan_a',
      userId: USER_ID,
      label: 'A',
      data: planData,
      now: NOW,
    })
    const firstRevision = await publishPlanRevision(db, {
      planId: 'plan_a',
      userId: USER_ID,
      data: planData,
      now: NOW,
    })
    const secondRevision = await publishPlanRevision(db, {
      planId: 'plan_a',
      userId: USER_ID,
      data: { ...planData, name: 'Treino A publicado' },
      now: LATER,
    })

    expect(draft.planId).toBe('plan_a')
    expect(firstRevision.revisionNumber).toBe(1)
    expect(secondRevision.revisionNumber).toBe(2)
  })

  it('upserts workout sessions idempotently with latest updatedAt winning', async () => {
    await seedUser()

    const inserted = await upsertWorkoutSession(db, {
      id: 'session_1',
      userId: USER_ID,
      data: workoutSessionData,
      updatedAt: NOW,
      deletedAt: null,
    })
    const skippedOlder = await upsertWorkoutSession(db, {
      id: 'session_1',
      userId: USER_ID,
      data: { ...workoutSessionData, durationMinutes: 10 },
      updatedAt: new Date('2026-05-18T11:00:00.000Z'),
      deletedAt: null,
    })
    const acceptedNewer = await upsertWorkoutSession(db, {
      id: 'session_1',
      userId: USER_ID,
      data: { ...workoutSessionData, durationMinutes: 50 },
      updatedAt: LATER,
      deletedAt: null,
    })

    expect(inserted.accepted).toBe(true)
    expect(skippedOlder.accepted).toBe(false)
    expect(skippedOlder.session.data.durationMinutes).toBe(42)
    expect(acceptedNewer.accepted).toBe(true)
    expect(acceptedNewer.session.data.durationMinutes).toBe(50)
  })

  it('creates and updates equipment photo metadata', async () => {
    await seedUser()

    const created = await createOrUpdateEquipmentPhoto(db, {
      userId: USER_ID,
      exerciseId: 'exercise_1',
      path: 'equipment-photos/user/exercise_1.jpg',
      contentType: 'image/jpeg',
      byteSize: 1024,
      now: NOW,
    })
    const updated = await createOrUpdateEquipmentPhoto(db, {
      userId: USER_ID,
      exerciseId: 'exercise_1',
      path: 'equipment-photos/user/exercise_1.jpg',
      contentType: 'image/jpeg',
      byteSize: 2048,
      now: LATER,
    })

    expect(created.exerciseId).toBe('exercise_1')
    expect(updated.byteSize).toBe(2048)
    expect(updated.deletedAt).toBeNull()
  })

  it('stores and revokes hashed refresh tokens', async () => {
    await seedUser()

    const token = await createRefreshToken(db, {
      userId: USER_ID,
      tokenHash: 'refresh_hash',
      familyId: 'c8bfc3c2-2a8d-46ee-8147-cfbbeaf3d333',
      expiresAt: LATER,
      now: NOW,
    })
    const revoked = await revokeRefreshToken(db, 'refresh_hash', LATER)

    expect(token.revokedAt).toBeNull()
    expect(revoked?.revokedAt?.toISOString()).toBe(LATER.toISOString())
  })

  it('stores and revokes hashed admin sessions', async () => {
    await seedUser()

    const session = await createAdminSession(db, {
      userId: USER_ID,
      sessionHash: 'admin_hash',
      expiresAt: LATER,
      now: NOW,
    })
    const revoked = await revokeAdminSession(db, 'admin_hash', LATER)

    expect(session.sessionHash).toBe('admin_hash')
    expect(revoked?.revokedAt?.toISOString()).toBe(LATER.toISOString())
  })

  it('stores, uses, and expires one-time mobile auth codes', async () => {
    await seedUser()
    const useTime = new Date('2026-05-18T12:30:00.000Z')

    const code = await createMobileAuthCode(db, {
      userId: USER_ID,
      codeHash: 'code_hash',
      redirectUri: 'forja://auth',
      expiresAt: LATER,
      now: NOW,
    })
    const expiredCode = await createMobileAuthCode(db, {
      userId: USER_ID,
      codeHash: 'expired_code_hash',
      redirectUri: 'forja://auth',
      expiresAt: NOW,
      now: NOW,
    })
    const used = await useMobileAuthCode(db, 'code_hash', useTime)
    const reused = await useMobileAuthCode(db, 'code_hash', useTime)
    const expired = await useMobileAuthCode(db, 'expired_code_hash', LATER)

    expect(code.usedAt).toBeNull()
    expect(expiredCode.usedAt).toBeNull()
    expect(used?.usedAt?.toISOString()).toBe(useTime.toISOString())
    expect(reused).toBeNull()
    expect(expired).toBeNull()
  })

  it('creates plan tombstones', async () => {
    await seedUser()
    await createPlanDraft(db, {
      planId: 'plan_a',
      userId: USER_ID,
      label: 'A',
      data: planData,
      now: NOW,
    })

    const tombstone = await createPlanTombstone(db, {
      planId: 'plan_a',
      userId: USER_ID,
      deletedAt: LATER,
    })

    expect(tombstone.planId).toBe('plan_a')
    expect(tombstone.deletedAt.toISOString()).toBe(LATER.toISOString())
  })

  it('creates import job metadata without raw payloads', async () => {
    await seedUser()

    const job = await createImportJob(db, {
      userId: USER_ID,
      label: 'A',
      status: 'pending',
      now: NOW,
    })

    expect(job.status).toBe('pending')
    expect(job.errorMessage).toBeNull()
  })
})

async function seedUser(): Promise<void> {
  await createUser(db, {
    id: USER_ID,
    email: 'user@example.com',
    name: 'User',
    now: NOW,
  })
}
