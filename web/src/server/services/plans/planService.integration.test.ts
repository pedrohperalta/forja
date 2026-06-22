import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { type Exercise } from '@forja/domain'
import { migrateDatabase } from '../../db/migrate'
import * as schema from '../../db/schema'
import { assertTestDatabaseUrl, resetDatabase } from '../../db/testDatabase'
import { createUser } from '../../repositories'
import {
  archivePlan,
  createDraftPlan,
  deletePlanPermanently,
  getAdminPlan,
  getLatestPublishedPlanRevision,
  listAdminPlans,
  publishDraftPlan,
  reorderDraftExercises,
  restoreArchivedPlan,
  updateDraftExercise,
  updateDraftPlanDetails,
} from './planService'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const USER_ID = '0a9d699f-c75f-4a55-a924-79a607f2f420'
const NOW = new Date('2026-05-18T12:00:00.000Z')
const LATER = new Date('2026-05-18T13:00:00.000Z')

const firstExercise = {
  id: 'supino-reto',
  name: 'Supino Reto',
  category: 'Peito',
  equipment: 'Barra',
  reps: '10-12',
  sets: 3,
  restSeconds: 60,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
} satisfies Exercise

const secondExercise = {
  id: 'desenvolvimento',
  name: 'Desenvolvimento',
  category: 'Ombros',
  equipment: 'Halteres',
  reps: '8-10',
  sets: 4,
  restSeconds: 90,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
} satisfies Exercise

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('plan service', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
    await createUser(db, {
      id: USER_ID,
      email: 'admin@example.com',
      name: 'Admin',
      now: NOW,
    })
  })

  afterAll(async () => {
    await client.end()
  })

  it('creates and updates a draft plan with structured data', async () => {
    const draft = await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A',
      focus: 'Peito / Ombros / Tríceps',
      exercises: [firstExercise],
      now: NOW,
    })

    const updated = await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A1',
      name: 'Treino A atualizado',
      focus: 'Empurrar',
      now: LATER,
    })

    expect(draft.data.name).toBe('Treino A')
    expect(updated.data.label).toBe('A1')
    expect(updated.data.name).toBe('Treino A atualizado')
    expect(updated.data.focus).toBe('Empurrar')
    expect(updated.data.updatedAt).toBe(LATER.toISOString())
  })

  it('edits exercise fields and reorders exercises without raw JSON patches', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A',
      focus: 'Peito / Ombros',
      exercises: [firstExercise, secondExercise],
      now: NOW,
    })

    const edited = await updateDraftExercise(db, {
      userId: USER_ID,
      planId: 'plan_a',
      exerciseId: 'supino-reto',
      exercise: {
        name: 'Supino Inclinado',
        category: 'Peito',
        equipment: 'Halteres',
        reps: '8-10',
        sets: 4,
        restSeconds: 75,
      },
      now: LATER,
    })
    const reordered = await reorderDraftExercises(db, {
      userId: USER_ID,
      planId: 'plan_a',
      exerciseIds: ['desenvolvimento', 'supino-reto'],
      now: LATER,
    })

    expect(edited.data.exercises[0]).toMatchObject({
      id: 'supino-reto',
      name: 'Supino Inclinado',
      equipment: 'Halteres',
      sets: 4,
    })
    expect(reordered.data.exercises.map((exercise) => exercise.id)).toEqual([
      'desenvolvimento',
      'supino-reto',
    ])
  })

  it('publishes immutable revisions while keeping later draft changes private', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A',
      focus: 'Peito / Ombros',
      exercises: [firstExercise],
      now: NOW,
    })

    const firstRevision = await publishDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      now: NOW,
    })
    await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A em rascunho',
      focus: 'Peito atualizado',
      now: LATER,
    })
    const latestPublished = await getLatestPublishedPlanRevision(db, {
      userId: USER_ID,
      planId: 'plan_a',
    })
    const secondRevision = await publishDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      now: LATER,
    })

    expect(firstRevision.revisionNumber).toBe(1)
    expect(latestPublished?.data.name).toBe('Treino A')
    expect(secondRevision.revisionNumber).toBe(2)
    expect(firstRevision.data.name).toBe('Treino A')
    expect(secondRevision.data.name).toBe('Treino A em rascunho')
  })

  it('lists active plans by default and archived plans only when requested', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A',
      focus: 'Peito',
      exercises: [firstExercise],
      now: NOW,
    })
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_b',
      label: 'B',
      name: 'Treino B',
      focus: 'Costas',
      exercises: [secondExercise],
      now: NOW,
    })
    await archivePlan(db, {
      userId: USER_ID,
      planId: 'plan_b',
      now: LATER,
    })

    const activePlans = await listAdminPlans(db, { userId: USER_ID })
    const allPlans = await listAdminPlans(db, {
      userId: USER_ID,
      includeArchived: true,
    })

    expect(activePlans.map((plan) => plan.plan.id)).toEqual(['plan_a'])
    expect(allPlans.map((plan) => plan.plan.id)).toEqual(['plan_a', 'plan_b'])
    expect(allPlans.find((plan) => plan.plan.id === 'plan_b')?.archived).toBe(
      true,
    )
  })

  it('archives a plan by creating a tombstone', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      label: 'A',
      name: 'Treino A',
      focus: 'Peito',
      exercises: [firstExercise],
      now: NOW,
    })

    const archived = await archivePlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
      now: LATER,
    })
    const plan = await getAdminPlan(db, {
      userId: USER_ID,
      planId: 'plan_a',
    })

    expect(archived.deletedAt.toISOString()).toBe(LATER.toISOString())
    expect(plan?.archived).toBe(true)
    expect(plan?.tombstone?.deletedAt.toISOString()).toBe(LATER.toISOString())
  })

  it('permanently deletes a plan and removes it from admin views', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_delete',
      label: 'DEL',
      name: 'Treino para excluir',
      focus: 'Costas',
      exercises: [firstExercise],
      now: NOW,
    })
    await publishDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_delete',
      now: NOW,
    })
    await archivePlan(db, {
      userId: USER_ID,
      planId: 'plan_delete',
      now: LATER,
    })

    const deleted = await deletePlanPermanently(db, {
      userId: USER_ID,
      planId: 'plan_delete',
    })
    const detail = await getAdminPlan(db, {
      userId: USER_ID,
      planId: 'plan_delete',
    })
    const plans = await listAdminPlans(db, {
      userId: USER_ID,
      includeArchived: true,
    })

    expect(deleted.id).toBe('plan_delete')
    expect(detail).toBeNull()
    expect(plans.map((plan) => plan.plan.id)).not.toContain('plan_delete')
  })

  it('restores an archived plan for editing and requires a new publication', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore',
      label: 'R',
      name: 'Treino para restaurar',
      focus: 'Peito',
      exercises: [firstExercise],
      now: NOW,
    })
    await publishDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore',
      now: NOW,
    })
    await archivePlan(db, {
      userId: USER_ID,
      planId: 'plan_restore',
      now: LATER,
    })

    const restored = await restoreArchivedPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore',
      now: new Date('2026-05-18T14:00:00.000Z'),
    })
    const detail = await getAdminPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore',
    })
    const activePlans = await listAdminPlans(db, { userId: USER_ID })

    expect(restored.archivedAt).toBeNull()
    expect(detail?.archived).toBe(false)
    expect(detail?.tombstone).toBeNull()
    expect(detail?.draft?.data.updatedAt).toBe('2026-05-18T14:00:00.000Z')
    expect(detail?.latestRevision?.data.updatedAt).toBe(NOW.toISOString())
    expect(activePlans.map((plan) => plan.plan.id)).toContain('plan_restore')
  })

  it('rejects invalid plan data through domain validation', async () => {
    await expect(
      createDraftPlan(db, {
        userId: USER_ID,
        planId: 'plan_invalid',
        label: 'Inválido',
        name: 'Treino inválido',
        focus: 'Peito',
        exercises: [{ ...firstExercise, sets: 0 }],
        now: NOW,
      }),
    ).rejects.toThrow()
  })
})
