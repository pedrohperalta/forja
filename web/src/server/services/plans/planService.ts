import { randomUUID } from 'node:crypto'

import { ExerciseSchema, PlanSchema, type Exercise, type MuscleCategory, type Plan } from '@forja/domain'
import { getPublicationState, type PublicationState } from '@/lib/publicationState'
import { forbidden, notFound, validation } from '@/server/http/appError'
import {
  createPlanDraft,
  createPlanTombstone,
  deletePlanById,
  deletePlanTombstone,
  findLatestPlanRevision,
  findPlanById,
  findPlanDraft,
  findPlanTombstone,
  listPlansByUser,
  publishPlanRevision,
  restorePlanById,
  updatePlanDraft,
  type Database,
  type PlanDraftRow,
  type PlanRevisionRow,
  type PlanRow,
  type PlanTombstoneRow,
} from '../../repositories'

export type CreateDraftPlanInput = {
  userId: string
  planId: string
  label: string
  name: string
  focus: string
  exercises: Exercise[]
  importedAt?: Date
  now: Date
}

export type UpdateDraftPlanDetailsInput = {
  userId: string
  planId: string
  label: string
  name: string
  focus: string
  now: Date
}

export type StructuredExerciseFields = {
  name: string
  category: MuscleCategory
  equipment: string
  reps: string
  sets: number
  restSeconds: number
}

export type UpdateDraftExerciseInput = {
  userId: string
  planId: string
  exerciseId: string
  exercise: StructuredExerciseFields
  now: Date
}

export type ReorderDraftExercisesInput = {
  userId: string
  planId: string
  exerciseIds: string[]
  now: Date
}

export type AddDraftExerciseInput = {
  userId: string
  planId: string
  exerciseId: string
  name: string
  category: MuscleCategory
  now: Date
}

export type RemoveDraftExerciseInput = {
  userId: string
  planId: string
  exerciseId: string
  now: Date
}

export const DEFAULT_EXERCISE_EQUIPMENT = 'A definir'
export const DEFAULT_EXERCISE_REPS = '10-12'
export const DEFAULT_EXERCISE_SETS = 3
export const DEFAULT_EXERCISE_REST_SECONDS = 60

export type PublishDraftPlanInput = {
  userId: string
  planId: string
  now: Date
}

export type DuplicatePlanInput = {
  userId: string
  sourcePlanId: string
  now: Date
}

export type ArchivePlanInput = {
  userId: string
  planId: string
  now: Date
}

export type RestoreArchivedPlanInput = {
  userId: string
  planId: string
  now: Date
}

export type PlanLookupInput = {
  userId: string
  planId: string
}

export type ListAdminPlansInput = {
  userId: string
  includeArchived?: boolean
}

export type AdminPlanListItem = {
  plan: PlanRow
  draftName: string | null
  draftFocus: string | null
  draftImportedAt: string | null
  latestRevisionNumber: number | null
  publicationState: PublicationState
  archived: boolean
}

export type AdminPlanDetail = {
  plan: PlanRow
  draft: PlanDraftRow | null
  latestRevisionNumber: number | null
  latestRevision: Pick<PlanRevisionRow, 'revisionNumber' | 'data'> | null
  archived: boolean
  tombstone: PlanTombstoneRow | null
}

export async function createDraftPlan(
  db: Database,
  input: CreateDraftPlanInput,
): Promise<PlanDraftRow> {
  const nowIso = input.now.toISOString()
  const label = await uniquifyActiveLabel(db, input.userId, input.label)
  const data = PlanSchema.parse({
    id: input.planId,
    label,
    name: input.name,
    focus: input.focus,
    exercises: input.exercises.map((exercise) => ExerciseSchema.parse(exercise)),
    ...(input.importedAt ? { importedAt: input.importedAt.toISOString() } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  })

  return createPlanDraft(db, {
    planId: input.planId,
    userId: input.userId,
    label,
    data,
    now: input.now,
  })
}

export async function updateDraftPlanDetails(
  db: Database,
  input: UpdateDraftPlanDetailsInput,
): Promise<PlanDraftRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const updatedAt = input.now.toISOString()
  const label = await uniquifyActiveLabel(db, input.userId, input.label, input.planId)
  const data = PlanSchema.parse({
    ...draft.data,
    label,
    name: input.name,
    focus: input.focus,
    updatedAt,
  })

  return requireUpdatedDraft(
    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label,
      data,
      now: input.now,
    }),
  )
}

export async function updateDraftExercise(
  db: Database,
  input: UpdateDraftExerciseInput,
): Promise<PlanDraftRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const exerciseIndex = draft.data.exercises.findIndex(
    (exercise) => exercise.id === input.exerciseId,
  )

  if (exerciseIndex === -1) {
    throw notFound('Exercise not found')
  }

  const existingExercise = draft.data.exercises[exerciseIndex]
  if (!existingExercise) {
    throw notFound('Exercise not found')
  }
  const updatedExercise = ExerciseSchema.parse({
    id: input.exerciseId,
    createdAt: existingExercise.createdAt,
    updatedAt: input.now.toISOString(),
    ...input.exercise,
  })
  const exercises = draft.data.exercises.map((exercise) =>
    exercise.id === input.exerciseId ? updatedExercise : exercise,
  )

  return saveDraftData(db, {
    draft,
    userId: input.userId,
    planId: input.planId,
    label: draft.data.label,
    exercises,
    now: input.now,
  })
}

export async function reorderDraftExercises(
  db: Database,
  input: ReorderDraftExercisesInput,
): Promise<PlanDraftRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const exerciseById = new Map(draft.data.exercises.map((exercise) => [exercise.id, exercise]))
  const uniqueIds = new Set(input.exerciseIds)

  if (
    input.exerciseIds.length !== draft.data.exercises.length ||
    uniqueIds.size !== draft.data.exercises.length
  ) {
    throw validation('Exercise order must include each exercise once')
  }

  const exercises = input.exerciseIds.map((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)

    if (!exercise) {
      throw validation('Exercise order includes an unknown exercise')
    }

    return exercise
  })

  return saveDraftData(db, {
    draft,
    userId: input.userId,
    planId: input.planId,
    label: draft.data.label,
    exercises,
    now: input.now,
  })
}

export async function addDraftExercise(
  db: Database,
  input: AddDraftExerciseInput,
): Promise<PlanDraftRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const nowIso = input.now.toISOString()
  const exercise = ExerciseSchema.parse({
    id: input.exerciseId,
    name: input.name,
    category: input.category,
    equipment: DEFAULT_EXERCISE_EQUIPMENT,
    reps: DEFAULT_EXERCISE_REPS,
    sets: DEFAULT_EXERCISE_SETS,
    restSeconds: DEFAULT_EXERCISE_REST_SECONDS,
    createdAt: nowIso,
    updatedAt: nowIso,
  })

  return saveDraftData(db, {
    draft,
    userId: input.userId,
    planId: input.planId,
    label: draft.data.label,
    exercises: [...draft.data.exercises, exercise],
    now: input.now,
  })
}

export async function removeDraftExercise(
  db: Database,
  input: RemoveDraftExerciseInput,
): Promise<PlanDraftRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const exercises = draft.data.exercises.filter((exercise) => exercise.id !== input.exerciseId)

  if (exercises.length === draft.data.exercises.length) {
    throw notFound('Exercise not found')
  }

  return saveDraftData(db, {
    draft,
    userId: input.userId,
    planId: input.planId,
    label: draft.data.label,
    exercises,
    now: input.now,
  })
}

export async function publishDraftPlan(
  db: Database,
  input: PublishDraftPlanInput,
): Promise<PlanRevisionRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)
  const data = PlanSchema.parse({
    ...stripImportMetadata(draft.data),
    updatedAt: input.now.toISOString(),
  })

  await updatePlanDraft(db, {
    planId: input.planId,
    userId: input.userId,
    label: draft.data.label,
    data,
    now: input.now,
  })

  return publishPlanRevision(db, {
    planId: input.planId,
    userId: input.userId,
    data,
    now: input.now,
  })
}

export async function duplicatePlan(
  db: Database,
  input: DuplicatePlanInput,
): Promise<PlanDraftRow> {
  const source = await requireEditableDraft(db, input.userId, input.sourcePlanId)
  const name = `Cópia de ${source.data.name}`
  const label = await uniquifyActiveLabel(db, input.userId, name)
  const nowIso = input.now.toISOString()
  const data = PlanSchema.parse({
    ...stripImportMetadata(source.data),
    id: `plan_${randomUUID()}`,
    label,
    name,
    exercises: stripImportMetadata(source.data).exercises.map((exercise) => ({
      ...exercise,
      id: `exercise_${randomUUID()}`,
      updatedAt: nowIso,
    })),
    createdAt: nowIso,
    updatedAt: nowIso,
  })

  return createPlanDraft(db, {
    planId: data.id,
    userId: input.userId,
    label,
    data,
    now: input.now,
  })
}

function stripImportMetadata(plan: Plan): Omit<Plan, 'importedAt'> & {
  exercises: Array<Omit<Exercise, 'needsReview'>>
} {
  return {
    ...omitKey(plan, 'importedAt'),
    exercises: plan.exercises.map((exercise) => omitKey(exercise, 'needsReview')),
  }
}

function omitKey<Source extends Record<string, unknown>, Key extends keyof Source>(
  source: Source,
  key: Key,
): Omit<Source, Key> {
  const copy: Record<string, unknown> = { ...source }
  delete copy[key as string]

  return copy as Omit<Source, Key>
}

export async function archivePlan(
  db: Database,
  input: ArchivePlanInput,
): Promise<PlanTombstoneRow> {
  const plan = await findPlanById(db, input.userId, input.planId)

  if (!plan) {
    throw notFound('Plan not found')
  }

  return createPlanTombstone(db, {
    planId: input.planId,
    userId: input.userId,
    deletedAt: input.now,
  })
}

export async function deletePlanPermanently(
  db: Database,
  input: PlanLookupInput,
): Promise<PlanRow> {
  const plan = await deletePlanById(db, input.userId, input.planId)

  if (!plan) {
    throw notFound('Plan not found')
  }

  return plan
}

export async function restoreArchivedPlan(
  db: Database,
  input: RestoreArchivedPlanInput,
): Promise<PlanRow> {
  const existingPlan = await findPlanById(db, input.userId, input.planId)

  if (!existingPlan) {
    throw notFound('Plan not found')
  }

  const label = await uniquifyActiveLabel(db, input.userId, existingPlan.label, input.planId)
  const draft = await findPlanDraft(db, input.userId, input.planId)
  const labelChanged = label !== existingPlan.label

  if (draft && labelChanged) {
    const data = PlanSchema.parse({
      ...draft.data,
      label,
      updatedAt: input.now.toISOString(),
    })

    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label,
      data,
      now: input.now,
    })
  }

  const plan = await restorePlanById(db, input.userId, input.planId, input.now)

  if (!plan) {
    throw notFound('Plan not found')
  }

  await deletePlanTombstone(db, input.userId, input.planId)

  if (draft && !labelChanged) {
    const data = PlanSchema.parse({
      ...draft.data,
      updatedAt: input.now.toISOString(),
    })

    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label,
      data,
      now: input.now,
    })
  }

  return plan
}

export async function listAdminPlans(
  db: Database,
  input: ListAdminPlansInput,
): Promise<AdminPlanListItem[]> {
  const plans = await listPlansByUser(db, input.userId, input.includeArchived)

  return Promise.all(
    plans.map(async (plan) => {
      const draft = await findPlanDraft(db, input.userId, plan.id)
      const latestRevision = await findLatestPlanRevision(db, input.userId, plan.id)
      const archived = plan.archivedAt !== null

      return {
        plan,
        draftName: draft?.data.name ?? null,
        draftFocus: draft?.data.focus ?? null,
        draftImportedAt: draft?.data.importedAt ?? null,
        latestRevisionNumber: latestRevision?.revisionNumber ?? null,
        publicationState: getPublicationState({
          archived,
          draftData: draft?.data ?? null,
          latestRevisionData: latestRevision?.data ?? null,
        }),
        archived,
      }
    }),
  )
}

export async function getAdminPlan(
  db: Database,
  input: PlanLookupInput,
): Promise<AdminPlanDetail | null> {
  const plan = await findPlanById(db, input.userId, input.planId)

  if (!plan) {
    return null
  }

  const [draft, latestRevision, tombstone] = await Promise.all([
    findPlanDraft(db, input.userId, input.planId),
    findLatestPlanRevision(db, input.userId, input.planId),
    findPlanTombstone(db, input.userId, input.planId),
  ])

  return {
    plan,
    draft,
    latestRevisionNumber: latestRevision?.revisionNumber ?? null,
    latestRevision: latestRevision
      ? {
          revisionNumber: latestRevision.revisionNumber,
          data: latestRevision.data,
        }
      : null,
    archived: plan.archivedAt !== null,
    tombstone,
  }
}

export async function getLatestPublishedPlanRevision(
  db: Database,
  input: PlanLookupInput,
): Promise<PlanRevisionRow | null> {
  return findLatestPlanRevision(db, input.userId, input.planId)
}

type SaveDraftDataInput = {
  draft: PlanDraftRow
  userId: string
  planId: string
  label: string
  exercises: Exercise[]
  now: Date
}

async function saveDraftData(db: Database, input: SaveDraftDataInput): Promise<PlanDraftRow> {
  const label = await uniquifyActiveLabel(db, input.userId, input.label, input.planId)
  const data = PlanSchema.parse({
    ...input.draft.data,
    label,
    exercises: input.exercises,
    updatedAt: input.now.toISOString(),
  })

  return requireUpdatedDraft(
    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label,
      data,
      now: input.now,
    }),
  )
}

async function requireEditableDraft(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanDraftRow> {
  const detail = await getAdminPlan(db, { userId, planId })

  if (!detail?.draft) {
    throw notFound('Plan draft not found')
  }

  if (detail.archived) {
    throw forbidden('Archived plans cannot be edited')
  }

  return detail.draft
}

/**
 * Active plans hold a unique label per user (A/B/C identity in the app).
 * Derived labels collide easily, so the service adjusts them transparently:
 * "Treino A" -> "Treino A 2", "Treino A 3", ...
 */
async function uniquifyActiveLabel(
  db: Database,
  userId: string,
  desiredLabel: string,
  excludingPlanId?: string,
): Promise<string> {
  const activePlans = await listPlansByUser(db, userId, false)
  const takenLabels = new Set(
    activePlans.filter((plan) => plan.id !== excludingPlanId).map((plan) => plan.label),
  )

  if (!takenLabels.has(desiredLabel)) {
    return desiredLabel
  }

  let suffix = 2
  while (takenLabels.has(`${desiredLabel} ${suffix}`)) {
    suffix += 1
  }

  return `${desiredLabel} ${suffix}`
}

function requireUpdatedDraft(draft: PlanDraftRow | null): PlanDraftRow {
  if (!draft) {
    throw notFound('Plan draft not found')
  }

  return draft
}
