import {
  ExerciseSchema,
  PlanSchema,
  type Exercise,
  type MuscleCategory,
} from '@forja/domain'
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

export type PublishDraftPlanInput = {
  userId: string
  planId: string
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
  latestRevisionNumber: number | null
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
  const data = PlanSchema.parse({
    id: input.planId,
    label: input.label,
    name: input.name,
    focus: input.focus,
    exercises: input.exercises.map((exercise) => ExerciseSchema.parse(exercise)),
    createdAt: nowIso,
    updatedAt: nowIso,
  })

  return createPlanDraft(db, {
    planId: input.planId,
    userId: input.userId,
    label: input.label,
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
  const data = PlanSchema.parse({
    ...draft.data,
    label: input.label,
    name: input.name,
    focus: input.focus,
    updatedAt,
  })

  return requireUpdatedDraft(
    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label: input.label,
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
    throw new Error('Exercise not found')
  }

  const existingExercise = draft.data.exercises[exerciseIndex]
  if (!existingExercise) {
    throw new Error('Exercise not found')
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
  const exerciseById = new Map(
    draft.data.exercises.map((exercise) => [exercise.id, exercise]),
  )
  const uniqueIds = new Set(input.exerciseIds)

  if (
    input.exerciseIds.length !== draft.data.exercises.length ||
    uniqueIds.size !== draft.data.exercises.length
  ) {
    throw new Error('Exercise order must include each exercise once')
  }

  const exercises = input.exerciseIds.map((exerciseId) => {
    const exercise = exerciseById.get(exerciseId)

    if (!exercise) {
      throw new Error('Exercise order includes an unknown exercise')
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

export async function publishDraftPlan(
  db: Database,
  input: PublishDraftPlanInput,
): Promise<PlanRevisionRow> {
  const draft = await requireEditableDraft(db, input.userId, input.planId)

  return publishPlanRevision(db, {
    planId: input.planId,
    userId: input.userId,
    data: PlanSchema.parse(draft.data),
    now: input.now,
  })
}

export async function archivePlan(
  db: Database,
  input: ArchivePlanInput,
): Promise<PlanTombstoneRow> {
  const plan = await findPlanById(db, input.userId, input.planId)

  if (!plan) {
    throw new Error('Plan not found')
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
    throw new Error('Plan not found')
  }

  return plan
}

export async function restoreArchivedPlan(
  db: Database,
  input: RestoreArchivedPlanInput,
): Promise<PlanRow> {
  const plan = await restorePlanById(db, input.userId, input.planId, input.now)

  if (!plan) {
    throw new Error('Plan not found')
  }

  await deletePlanTombstone(db, input.userId, input.planId)

  const draft = await findPlanDraft(db, input.userId, input.planId)
  if (draft) {
    const data = PlanSchema.parse({
      ...draft.data,
      updatedAt: input.now.toISOString(),
    })

    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label: draft.data.label,
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
      const latestRevision = await findLatestPlanRevision(
        db,
        input.userId,
        plan.id,
      )

      return {
        plan,
        draftName: draft?.data.name ?? null,
        draftFocus: draft?.data.focus ?? null,
        latestRevisionNumber: latestRevision?.revisionNumber ?? null,
        archived: plan.archivedAt !== null,
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

async function saveDraftData(
  db: Database,
  input: SaveDraftDataInput,
): Promise<PlanDraftRow> {
  const data = PlanSchema.parse({
    ...input.draft.data,
    exercises: input.exercises,
    updatedAt: input.now.toISOString(),
  })

  return requireUpdatedDraft(
    await updatePlanDraft(db, {
      planId: input.planId,
      userId: input.userId,
      label: input.label,
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
    throw new Error('Plan draft not found')
  }

  if (detail.archived) {
    throw new Error('Archived plans cannot be edited')
  }

  return detail.draft
}

function requireUpdatedDraft(draft: PlanDraftRow | null): PlanDraftRow {
  if (!draft) {
    throw new Error('Plan draft not found')
  }

  return draft
}
