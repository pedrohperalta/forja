import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { SyncPullResponseSchema, type Exercise } from '@forja/domain'
import { migrateDatabase } from '../../db/migrate'
import * as schema from '../../db/schema'
import { assertTestDatabaseUrl, resetDatabase } from '../../db/testDatabase'
import { createUser } from '../../repositories'
import {
  archivePlan,
  createDraftPlan,
  publishDraftPlan,
  updateDraftPlanDetails,
} from '../plans/planService'
import { pullPlanChanges, signSyncCursor } from './planPullService'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const USER_ID = '0a9d699f-c75f-4a55-a924-79a607f2f420'
const OTHER_USER_ID = '60adcf44-f0f4-4c53-9dbc-26401302c84c'
const SECRET = 'sync-cursor-secret'
const FIRST = new Date('2026-05-18T12:00:00.000Z')
const SECOND = new Date('2026-05-18T13:00:00.000Z')
const THIRD = new Date('2026-05-18T14:00:00.000Z')
const FOURTH = new Date('2026-05-18T15:00:00.000Z')

const exercise = {
  id: 'supino-reto',
  name: 'Supino Reto',
  category: 'Peito',
  equipment: 'Barra',
  reps: '10-12',
  sets: 3,
  restSeconds: 60,
  createdAt: FIRST.toISOString(),
  updatedAt: FIRST.toISOString(),
} satisfies Exercise

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('plan pull service', () => {
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

  it('returns all current published active plans when cursor is absent', async () => {
    await createPublishedPlan('plan_a', 'A', 'Treino A', FIRST)
    await createPublishedPlan('plan_b', 'B', 'Treino B', SECOND)

    const response = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor: null,
      cursorSecret: SECRET,
    })

    expect(response.plans.map((plan) => plan.id)).toEqual(['plan_a', 'plan_b'])
    expect(response.workoutSessions).toEqual([])
    expect(response.deletedWorkoutSessionIds).toEqual([])
    expect(SyncPullResponseSchema.safeParse(response).success).toBe(true)
  })

  it('returns only changes after a signed cursor', async () => {
    await createPublishedPlan('plan_a', 'A', 'Treino A', FIRST)
    await createPublishedPlan('plan_b', 'B', 'Treino B', THIRD)
    const cursor = signSyncCursor(
      { lastChangedAt: SECOND.toISOString(), lastId: 'plan_a' },
      SECRET,
    )

    const response = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor,
      cursorSecret: SECRET,
    })

    expect(response.plans.map((plan) => plan.id)).toEqual(['plan_b'])
  })

  it('rejects tampered cursors', async () => {
    const cursor = signSyncCursor(
      { lastChangedAt: FIRST.toISOString(), lastId: 'plan_a' },
      SECRET,
    )

    await expect(
      pullPlanChanges(db, {
        userId: USER_ID,
        cursor: `${cursor}tampered`,
        cursorSecret: SECRET,
      }),
    ).rejects.toThrow(/Invalid cursor/)
  })

  it('never returns draft-only changes', async () => {
    await createPublishedPlan('plan_a', 'A', 'Treino A', FIRST)
    const cursor = signSyncCursor(
      { lastChangedAt: SECOND.toISOString(), lastId: 'plan_a' },
      SECRET,
    )
    await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A em rascunho',
      focus: 'Peito atualizado',
      now: THIRD,
    })

    const response = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor,
      cursorSecret: SECRET,
    })

    expect(response.plans).toEqual([])
    expect(response.deletedPlanIds).toEqual([])
  })

  it('orders plan revisions and tombstones by changedAt and id', async () => {
    await createPublishedPlan('plan_b', 'B', 'Treino B', SECOND)
    await createPublishedPlan('plan_a', 'A', 'Treino A', SECOND)
    await createPublishedPlan('plan_c', 'C', 'Treino C', THIRD)
    await archivePlan(db, {
      userId: USER_ID,
      planId: 'plan_c',
      now: FOURTH,
    })

    const response = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor: null,
      cursorSecret: SECRET,
    })

    expect([
      ...response.plans.map((plan) => plan.id),
      ...response.deletedPlanIds,
    ]).toEqual(['plan_a', 'plan_b', 'plan_c'])
  })

  it('caps results and returns hasMore with an advancing cursor', async () => {
    await createPublishedPlan('plan_a', 'A', 'Treino A', FIRST)
    await createPublishedPlan('plan_b', 'B', 'Treino B', SECOND)
    await createPublishedPlan('plan_c', 'C', 'Treino C', THIRD)

    const firstPage = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor: null,
      cursorSecret: SECRET,
      limit: 2,
    })
    const secondPage = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor: firstPage.cursor,
      cursorSecret: SECRET,
      limit: 2,
    })

    expect(firstPage.hasMore).toBe(true)
    expect(firstPage.plans.map((plan) => plan.id)).toEqual(['plan_a', 'plan_b'])
    expect(secondPage.hasMore).toBe(false)
    expect(secondPage.plans.map((plan) => plan.id)).toEqual(['plan_c'])
  })

  it('scopes published plans to the authenticated user', async () => {
    await createPublishedPlan('plan_a', 'A', 'Treino A', FIRST)
    await createPublishedPlan('plan_other', 'O', 'Treino Outro', SECOND, OTHER_USER_ID)

    const response = await pullPlanChanges(db, {
      userId: USER_ID,
      cursor: null,
      cursorSecret: SECRET,
    })

    expect(response.plans.map((plan) => plan.id)).toEqual(['plan_a'])
  })
})

async function createPublishedPlan(
  planId: string,
  label: string,
  name: string,
  now: Date,
  userId = USER_ID,
): Promise<void> {
  await createDraftPlan(db, {
    userId,
    planId,
    label,
    name,
    focus: 'Peito / Ombros',
    exercises: [{ ...exercise, updatedAt: now.toISOString() }],
    now,
  })
  await publishDraftPlan(db, { userId, planId, now })
}
