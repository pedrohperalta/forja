import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { type Exercise } from '@forja/domain'
import { migrateDatabase } from '../../db/migrate'
import * as schema from '../../db/schema'
import { assertTestDatabaseUrl, resetDatabase } from '../../db/testDatabase'
import { createUser } from '../../repositories'
import {
  addDraftExercise,
  archivePlan,
  createDraftPlan,
  deletePlanPermanently,
  duplicatePlan,
  getAdminPlan,
  getLatestPublishedPlanRevision,
  listAdminPlans,
  publishDraftPlan,
  removeDraftExercise,
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

  it('exposes the publication state of each listed plan', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_fresh',
      label: 'F',
      name: 'Treino Novo',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_synced',
      label: 'S',
      name: 'Treino Sincronizado',
      focus: 'Costas',
      exercises: [firstExercise],
      now: NOW,
    })
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_edited',
      label: 'E',
      name: 'Treino Editado',
      focus: 'Ombros',
      exercises: [firstExercise],
      now: NOW,
    })

    await publishDraftPlan(db, { userId: USER_ID, planId: 'plan_synced', now: NOW })
    await publishDraftPlan(db, { userId: USER_ID, planId: 'plan_edited', now: NOW })
    await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_edited',
      label: 'E',
      name: 'Treino Editado com Pendências',
      focus: 'Ombros',
      now: LATER,
    })

    const plans = await listAdminPlans(db, { userId: USER_ID, includeArchived: true })
    const stateByPlanId = new Map(plans.map((plan) => [plan.plan.id, plan.publicationState]))

    expect(stateByPlanId.get('plan_fresh')).toBe('unpublished-draft')
    expect(stateByPlanId.get('plan_synced')).toBe('published')
    expect(stateByPlanId.get('plan_edited')).toBe('pending-changes')
  })

  it('adds an exercise to a draft with ready-made defaults', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_add',
      label: 'ADD',
      name: 'Treino para adicionar',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })

    const draft = await addDraftExercise(db, {
      userId: USER_ID,
      planId: 'plan_add',
      exerciseId: 'exercise_new',
      name: 'Remada Baixa',
      category: 'Costas',
      now: LATER,
    })

    expect(draft.data.exercises).toHaveLength(1)
    expect(draft.data.exercises[0]).toMatchObject({
      id: 'exercise_new',
      name: 'Remada Baixa',
      category: 'Costas',
      equipment: 'A definir',
      reps: '10-12',
      sets: 3,
      restSeconds: 60,
    })
  })

  it('removes an exercise from a draft and keeps the remaining order', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_remove',
      label: 'RM',
      name: 'Treino para remover',
      focus: 'Peito',
      exercises: [firstExercise, secondExercise],
      now: NOW,
    })

    const draft = await removeDraftExercise(db, {
      userId: USER_ID,
      planId: 'plan_remove',
      exerciseId: 'supino-reto',
      now: LATER,
    })

    expect(draft.data.exercises.map((exercise) => exercise.id)).toEqual(['desenvolvimento'])
  })

  it('rejects removing an unknown exercise', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_remove_missing',
      label: 'RMM',
      name: 'Treino para remover inexistente',
      focus: 'Peito',
      exercises: [firstExercise],
      now: NOW,
    })

    await expect(
      removeDraftExercise(db, {
        userId: USER_ID,
        planId: 'plan_remove_missing',
        exerciseId: 'exercise_nao_existe',
        now: LATER,
      }),
    ).rejects.toThrow('Exercise not found')
  })

  it('rejects exercise changes on archived plans', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_locked',
      label: 'LK',
      name: 'Treino travado',
      focus: 'Peito',
      exercises: [firstExercise],
      now: NOW,
    })
    await archivePlan(db, { userId: USER_ID, planId: 'plan_locked', now: LATER })

    await expect(
      addDraftExercise(db, {
        userId: USER_ID,
        planId: 'plan_locked',
        exerciseId: 'exercise_blocked',
        name: 'Bloqueado',
        category: 'Peito',
        now: LATER,
      }),
    ).rejects.toThrow('Archived plans cannot be edited')
    await expect(
      removeDraftExercise(db, {
        userId: USER_ID,
        planId: 'plan_locked',
        exerciseId: 'supino-reto',
        now: LATER,
      }),
    ).rejects.toThrow('Archived plans cannot be edited')
  })

  it('keeps import metadata on the draft until publication', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_imported',
      label: 'Ficha importada',
      name: 'Ficha importada',
      focus: 'Peito',
      exercises: [
        { ...firstExercise, needsReview: true },
        secondExercise,
      ],
      importedAt: NOW,
      now: NOW,
    })

    const detail = await getAdminPlan(db, { userId: USER_ID, planId: 'plan_imported' })
    const plans = await listAdminPlans(db, { userId: USER_ID })

    expect(detail?.draft?.data.importedAt).toBe(NOW.toISOString())
    expect(detail?.draft?.data.exercises[0]?.needsReview).toBe(true)
    expect(plans.find((plan) => plan.plan.id === 'plan_imported')?.draftImportedAt).toBe(
      NOW.toISOString(),
    )
  })

  it('strips import metadata from the draft and the revision on publish', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_strip',
      label: 'Ficha para publicar',
      name: 'Ficha para publicar',
      focus: 'Peito',
      exercises: [{ ...firstExercise, needsReview: true }],
      importedAt: NOW,
      now: NOW,
    })

    const revision = await publishDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_strip',
      now: LATER,
    })
    const detail = await getAdminPlan(db, { userId: USER_ID, planId: 'plan_strip' })
    const plans = await listAdminPlans(db, { userId: USER_ID })

    expect(revision.data.importedAt).toBeUndefined()
    expect(revision.data.exercises[0]?.needsReview).toBeUndefined()
    expect(detail?.draft?.data.importedAt).toBeUndefined()
    expect(detail?.draft?.data.exercises[0]?.needsReview).toBeUndefined()
    expect(plans.find((plan) => plan.plan.id === 'plan_strip')?.draftImportedAt).toBeNull()
  })

  it('duplicates a plan as an independent editable copy', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_source',
      label: 'Treino A',
      name: 'Treino A',
      focus: 'Peito',
      exercises: [
        { ...firstExercise, needsReview: true },
        secondExercise,
      ],
      importedAt: NOW,
      now: NOW,
    })

    const copy = await duplicatePlan(db, {
      userId: USER_ID,
      sourcePlanId: 'plan_source',
      now: LATER,
    })

    expect(copy.data.id).not.toBe('plan_source')
    expect(copy.data.name).toBe('Cópia de Treino A')
    expect(copy.data.focus).toBe('Peito')
    expect(copy.data.exercises).toHaveLength(2)
    expect(copy.data.exercises.map((exercise) => exercise.id)).not.toContain('supino-reto')
    expect(copy.data.exercises.every((exercise) => !exercise.needsReview)).toBe(true)
    expect(copy.data.importedAt).toBeUndefined()

    await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: copy.data.id,
      label: 'Cópia editada',
      name: 'Cópia editada',
      focus: 'Costas',
      now: LATER,
    })
    const source = await getAdminPlan(db, { userId: USER_ID, planId: 'plan_source' })

    expect(source?.draft?.data.name).toBe('Treino A')
    expect(source?.draft?.data.exercises).toHaveLength(2)
  })

  it('rejects duplicating archived or missing plans', async () => {
    await expect(
      duplicatePlan(db, { userId: USER_ID, sourcePlanId: 'plan_nao_existe', now: NOW }),
    ).rejects.toThrow('Plan draft not found')

    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_archived_copy',
      label: 'AC',
      name: 'Treino arquivado',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })
    await archivePlan(db, { userId: USER_ID, planId: 'plan_archived_copy', now: LATER })

    await expect(
      duplicatePlan(db, {
        userId: USER_ID,
        sourcePlanId: 'plan_archived_copy',
        now: LATER,
      }),
    ).rejects.toThrow('Archived plans cannot be edited')
  })

  it('uniquifies labels among active plans on creation', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_blank_1',
      label: 'Plano sem título',
      name: 'Plano sem título',
      focus: 'A definir',
      exercises: [],
      now: NOW,
    })

    const second = await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_blank_2',
      label: 'Plano sem título',
      name: 'Plano sem título',
      focus: 'A definir',
      exercises: [],
      now: LATER,
    })
    const third = await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_blank_3',
      label: 'Plano sem título',
      name: 'Plano sem título',
      focus: 'A definir',
      exercises: [],
      now: LATER,
    })

    expect(second.data.label).toBe('Plano sem título 2')
    expect(third.data.label).toBe('Plano sem título 3')
  })

  it('uniquifies a colliding rename instead of failing the save', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_one',
      label: 'Treino 1',
      name: 'Treino 1',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_two',
      label: 'Treino 2',
      name: 'Treino 2',
      focus: 'Costas',
      exercises: [],
      now: NOW,
    })

    const updated = await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_one',
      label: 'Treino 2',
      name: 'Treino 2',
      focus: 'Peito',
      now: LATER,
    })
    const otherPlan = await getAdminPlan(db, { userId: USER_ID, planId: 'plan_two' })

    expect(updated.data.label).toBe('Treino 2 2')
    expect(otherPlan?.plan.label).toBe('Treino 2')
  })

  it('keeps the own label when saving a plan without collision', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_keep',
      label: 'Treino Único',
      name: 'Treino Único',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })

    const updated = await updateDraftPlanDetails(db, {
      userId: USER_ID,
      planId: 'plan_keep',
      label: 'Treino Único',
      name: 'Treino Único v2',
      focus: 'Peito',
      now: LATER,
    })

    expect(updated.data.label).toBe('Treino Único')
  })

  it('ignores archived labels when uniquifying', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_old_label',
      label: 'Treino Reciclado',
      name: 'Treino Reciclado',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })
    await archivePlan(db, { userId: USER_ID, planId: 'plan_old_label', now: LATER })

    const recycled = await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_new_label',
      label: 'Treino Reciclado',
      name: 'Treino Reciclado',
      focus: 'Costas',
      exercises: [],
      now: LATER,
    })

    expect(recycled.data.label).toBe('Treino Reciclado')
  })

  it('uniquifies the label when restoring an archived plan', async () => {
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore_label',
      label: 'Treino R',
      name: 'Treino R',
      focus: 'Peito',
      exercises: [],
      now: NOW,
    })
    await archivePlan(db, { userId: USER_ID, planId: 'plan_restore_label', now: LATER })
    await createDraftPlan(db, {
      userId: USER_ID,
      planId: 'plan_took_label',
      label: 'Treino R',
      name: 'Treino R',
      focus: 'Costas',
      exercises: [],
      now: LATER,
    })

    await restoreArchivedPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore_label',
      now: LATER,
    })
    const restored = await getAdminPlan(db, {
      userId: USER_ID,
      planId: 'plan_restore_label',
    })

    expect(restored?.archived).toBe(false)
    expect(restored?.plan.label).toBe('Treino R 2')
    expect(restored?.draft?.data.label).toBe('Treino R 2')
  })
})
