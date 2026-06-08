import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { type SyncPushRequest, type WorkoutSession } from '@forja/domain'
import { migrateDatabase } from '../../db/migrate'
import * as schema from '../../db/schema'
import { assertTestDatabaseUrl, resetDatabase } from '../../db/testDatabase'
import { createUser, findWorkoutSessionById } from '../../repositories'
import { deleteWorkoutSession, pushWorkoutSessions } from './workoutPushService'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const USER_ID = '0a9d699f-c75f-4a55-a924-79a607f2f420'
const OTHER_USER_ID = '60adcf44-f0f4-4c53-9dbc-26401302c84c'
const FIRST = new Date('2026-05-18T12:00:00.000Z')
const SECOND = new Date('2026-05-18T13:00:00.000Z')
const THIRD = new Date('2026-05-18T14:00:00.000Z')

const workoutSession = {
  id: 'session_1',
  planId: 'plan_a',
  planName: 'Treino A',
  planLabel: 'A',
  focus: 'Peito / Ombros',
  date: FIRST.toISOString(),
  durationMinutes: 42,
  exercises: [{ name: 'Supino Reto', sets: 3, weight: 80 }],
  syncStatus: 'pending',
  version: 1,
  createdAt: FIRST.toISOString(),
  updatedAt: FIRST.toISOString(),
} satisfies WorkoutSession

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('workout push service', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
    await createUser(db, {
      id: USER_ID,
      email: 'user@example.com',
      name: 'User',
      now: FIRST,
    })
    await createUser(db, {
      id: OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other',
      now: FIRST,
    })
  })

  afterAll(async () => {
    await client.end()
  })

  it('accepts idempotent upserts and repeated client mutation IDs', async () => {
    const request = pushRequest([
      { id: 'session_1', data: workoutSession, updatedAt: FIRST, deletedAt: null },
    ])

    const firstPush = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request,
    })
    const repeatedPush = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request,
    })

    expect(firstPush.acceptedWorkoutSessionIds).toEqual(['session_1'])
    expect(repeatedPush.acceptedWorkoutSessionIds).toEqual([])
    expect(repeatedPush.skippedWorkoutSessionIds).toEqual(['session_1'])
    expect(repeatedPush.currentWorkoutSessions[0]?.data.durationMinutes).toBe(42)
  })

  it('accepts newer incoming sessions and keeps older or equal stored rows', async () => {
    await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        { id: 'session_1', data: workoutSession, updatedAt: SECOND, deletedAt: null },
      ]),
    })

    const olderPush = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'session_1',
          data: { ...workoutSession, durationMinutes: 10 },
          updatedAt: FIRST,
          deletedAt: null,
        },
      ]),
    })
    const equalPush = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'session_1',
          data: { ...workoutSession, durationMinutes: 20 },
          updatedAt: SECOND,
          deletedAt: null,
        },
      ]),
    })
    const newerPush = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'session_1',
          data: { ...workoutSession, durationMinutes: 55 },
          updatedAt: THIRD,
          deletedAt: null,
        },
      ]),
    })

    expect(olderPush.skippedWorkoutSessionIds).toEqual(['session_1'])
    expect(equalPush.skippedWorkoutSessionIds).toEqual(['session_1'])
    expect(newerPush.acceptedWorkoutSessionIds).toEqual(['session_1'])
    expect(newerPush.currentWorkoutSessions[0]?.data.durationMinutes).toBe(55)
  })

  it('accepts newer delete tombstones and ignores older delete tombstones', async () => {
    await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        { id: 'session_1', data: workoutSession, updatedAt: SECOND, deletedAt: null },
      ]),
    })

    const olderDelete = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'session_1',
          data: { ...workoutSession, durationMinutes: 99 },
          updatedAt: FIRST,
          deletedAt: FIRST,
        },
      ]),
    })
    const newerDelete = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'session_1',
          data: workoutSession,
          updatedAt: THIRD,
          deletedAt: THIRD,
        },
      ]),
    })

    expect(olderDelete.skippedWorkoutSessionIds).toEqual(['session_1'])
    expect(olderDelete.currentWorkoutSessions[0]?.data.durationMinutes).toBe(42)
    expect(newerDelete.acceptedWorkoutSessionIds).toEqual(['session_1'])
    expect((await findWorkoutSessionById(db, USER_ID, 'session_1'))?.deletedAt).toEqual(
      THIRD,
    )
  })

  it('scopes writes to the authenticated user', async () => {
    await pushWorkoutSessions(db, {
      userId: OTHER_USER_ID,
      request: pushRequest([
        {
          id: 'shared_session_id',
          data: { ...workoutSession, id: 'shared_session_id', durationMinutes: 10 },
          updatedAt: FIRST,
          deletedAt: null,
        },
      ]),
    })

    const result = await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        {
          id: 'shared_session_id',
          data: { ...workoutSession, id: 'shared_session_id', durationMinutes: 99 },
          updatedAt: SECOND,
          deletedAt: null,
        },
      ]),
    })

    expect(result.acceptedWorkoutSessionIds).toEqual([])
    expect(result.skippedWorkoutSessionIds).toEqual(['shared_session_id'])
    expect(
      (await findWorkoutSessionById(db, OTHER_USER_ID, 'shared_session_id'))?.data
        .durationMinutes,
    ).toBe(10)
  })

  it('rejects invalid session data', async () => {
    await expect(
      pushWorkoutSessions(db, {
        userId: USER_ID,
        request: pushRequest([
          {
            id: 'session_1',
            data: { ...workoutSession, durationMinutes: -1 },
            updatedAt: FIRST,
            deletedAt: null,
          },
        ]),
      }),
    ).rejects.toThrow()
  })

  it('deletes an existing session with a tombstone and repeated deletes succeed', async () => {
    await pushWorkoutSessions(db, {
      userId: USER_ID,
      request: pushRequest([
        { id: 'session_1', data: workoutSession, updatedAt: FIRST, deletedAt: null },
      ]),
    })

    await expect(
      deleteWorkoutSession(db, {
        userId: USER_ID,
        sessionId: 'session_1',
        now: SECOND,
      }),
    ).resolves.toEqual({ ok: true })
    await expect(
      deleteWorkoutSession(db, {
        userId: USER_ID,
        sessionId: 'session_1',
        now: SECOND,
      }),
    ).resolves.toEqual({ ok: true })

    const deleted = await findWorkoutSessionById(db, USER_ID, 'session_1')
    expect(deleted?.deletedAt).toEqual(SECOND)
    expect(deleted?.updatedAt).toEqual(SECOND)
  })

  it('does not delete another user session', async () => {
    await pushWorkoutSessions(db, {
      userId: OTHER_USER_ID,
      request: pushRequest([
        {
          id: 'shared_session_id',
          data: { ...workoutSession, id: 'shared_session_id' },
          updatedAt: FIRST,
          deletedAt: null,
        },
      ]),
    })

    await deleteWorkoutSession(db, {
      userId: USER_ID,
      sessionId: 'shared_session_id',
      now: SECOND,
    })

    expect(
      (await findWorkoutSessionById(db, OTHER_USER_ID, 'shared_session_id'))
        ?.deletedAt,
    ).toBeNull()
  })
})

function pushRequest(
  workoutSessions: {
    id: string
    data: WorkoutSession
    updatedAt: Date
    deletedAt: Date | null
  }[],
): SyncPushRequest {
  return {
    workoutSessions: workoutSessions.map((session) => ({
      id: session.id,
      data: session.data,
      updatedAt: session.updatedAt.toISOString(),
      deletedAt: session.deletedAt?.toISOString() ?? null,
    })),
    clientMutationId: '7a071858-1a4b-489f-a8cf-bd04f1f8b10f',
  }
}
