import { randomUUID } from 'node:crypto'

import { MuscleCategorySchema, type Plan } from '@forja/domain'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminAddExerciseForm } from '@/components/admin/AdminAddExerciseForm'
import { AdminPlanDraftForm } from '@/components/admin/AdminPlanDraftForm'
import { AdminCard, AdminFrame } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { getPublicationState, getPublicationStatus } from '@/lib/publicationState'
import {
  addDraftExercise,
  archivePlan,
  deletePlanPermanently,
  getAdminPlan,
  publishDraftPlan,
  removeDraftExercise,
  reorderDraftExercises,
  restoreArchivedPlan,
  updateDraftExercise,
  updateDraftPlanDetails,
} from '@/server/services/plans/planService'
import { getUploadsDir, uploadEquipmentPhoto } from '@/server/services/photos/equipmentPhotoService'

type PlanEditorViewProps = {
  addedExerciseId?: string | undefined
  plan: {
    plan: {
      id: string
      label: string
    }
    draft: {
      data: Plan
    } | null
    latestRevisionNumber: number | null
    latestRevision: {
      revisionNumber: number
      data: Plan
    } | null
    archived: boolean
    tombstone: {
      deletedAt: Date
    } | null
  }
  publishedRevision?: number | undefined
}

type PlanPageProps = {
  params: Promise<{
    planId: string
  }>
  searchParams: Promise<{
    added?: string
    published?: string
  }>
}

export function PlanEditorView({
  addedExerciseId,
  plan,
  publishedRevision,
}: PlanEditorViewProps): ReactElement {
  const draft = plan.draft

  if (!draft) {
    return (
      <AdminFrame
        active="plans"
        eyebrow="PLANOS"
        title={plan.plan.label}
        subtitle="Rascunho não encontrado."
      >
        <AdminCard>
          <p className="admin-muted">Crie um novo rascunho antes de editar este plano.</p>
        </AdminCard>
      </AdminFrame>
    )
  }

  const publicationState = getPublicationState({
    archived: plan.archived,
    draftData: draft.data,
    latestRevisionData: plan.latestRevision?.data ?? null,
  })
  const status = getPublicationStatus(publicationState)

  return (
    <AdminFrame
      active="plans"
      eyebrow="EDITOR DE PLANO"
      title={draft.data.name}
      subtitle={draft.data.focus}
    >
      {publishedRevision ? (
        <div className="admin-notice-banner" role="status">
          <strong>Rev. {publishedRevision} publicada</strong>
          <p>O app já pode sincronizar. Abra o Forja e puxe para atualizar.</p>
        </div>
      ) : null}

      <AdminPlanDraftForm
        addedExerciseId={addedExerciseId}
        archived={plan.archived}
        categoryOptions={MuscleCategorySchema.options}
        draft={draft.data}
        latestRevisionNumber={plan.latestRevisionNumber}
        planId={plan.plan.id}
        publishAction={publishPlanAction}
        removeExerciseAction={removeExerciseAction}
        restoreAction={restorePlanAction}
        saveDraftAction={saveDraftAction}
        status={status}
      />

      {plan.archived ? null : (
        <AdminAddExerciseForm
          addExerciseAction={addExerciseAction}
          categoryOptions={MuscleCategorySchema.options}
          empty={draft.data.exercises.length === 0}
          planId={plan.plan.id}
        />
      )}

      <section className="admin-section" aria-label="Zona de risco">
        <AdminCard>
          <div className="admin-danger-zone">
            <div className="admin-danger-actions">
              <div>
                <p className="admin-section-title">Zona de risco</p>
                <p className="admin-muted">
                  Arquivar oculta este plano do app e bloqueia novas edições neste rascunho.
                </p>
              </div>
              <form action={archivePlanAction}>
                <input name="planId" type="hidden" value={plan.plan.id} />
                <button className="admin-danger-button" disabled={plan.archived} type="submit">
                  Arquivar
                </button>
              </form>
            </div>
            <details className="admin-permanent-delete admin-delete-confirmation">
              <summary>Excluir definitivamente</summary>
              <div>
                <p className="admin-muted">
                  Esta ação apaga o plano, rascunhos e revisões. Não dá para desfazer.
                </p>
                <form action={deletePlanAction}>
                  <input name="planId" type="hidden" value={plan.plan.id} />
                  <button className="admin-danger-button admin-compact-button" type="submit">
                    Confirmar exclusão
                  </button>
                </form>
              </div>
            </details>
          </div>
        </AdminCard>
      </section>
    </AdminFrame>
  )
}

export default async function PlanPage({ params, searchParams }: PlanPageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { planId } = await params
  const { added, published } = await searchParams
  const plan = await getAdminPlan(getDatabase(), { userId: user.id, planId })

  if (!plan) {
    notFound()
  }

  const publishedRevisionNumber = published ? Number.parseInt(published, 10) : Number.NaN

  return (
    <PlanEditorView
      addedExerciseId={added?.trim() || undefined}
      plan={plan}
      publishedRevision={Number.isFinite(publishedRevisionNumber) ? publishedRevisionNumber : undefined}
    />
  )
}

async function saveDraftFromFormData(
  db: ReturnType<typeof getDatabase>,
  userId: string,
  planId: string,
  formData: FormData,
  now: Date,
): Promise<void> {
  const exerciseIds = getStringValues(formData, 'exerciseId')
  const exerciseNames = getFormDataValues(formData, 'exerciseName')
  const exerciseCategories = getFormDataValues(formData, 'exerciseCategory')
  const exerciseEquipment = getFormDataValues(formData, 'exerciseEquipment')
  const exerciseReps = getFormDataValues(formData, 'exerciseReps')
  const exerciseSets = getFormDataValues(formData, 'exerciseSets')
  const exerciseRestSeconds = getFormDataValues(formData, 'exerciseRestSeconds')

  await updateDraftPlanDetails(db, {
    userId,
    planId,
    label: getRequiredString(formData, 'label'),
    name: getRequiredString(formData, 'name'),
    focus: getRequiredString(formData, 'focus'),
    now,
  })

  for (const [index, exerciseId] of exerciseIds.entries()) {
    await updateDraftExercise(db, {
      userId,
      planId,
      exerciseId,
      exercise: {
        name: getRequiredStringAt(exerciseNames, 'exerciseName', index),
        category: MuscleCategorySchema.parse(
          getRequiredStringAt(exerciseCategories, 'exerciseCategory', index),
        ),
        equipment: getRequiredStringAt(exerciseEquipment, 'exerciseEquipment', index),
        reps: getRequiredStringAt(exerciseReps, 'exerciseReps', index),
        sets: getRequiredNumberAt(exerciseSets, 'exerciseSets', index),
        restSeconds: getRequiredNumberAt(exerciseRestSeconds, 'exerciseRestSeconds', index),
      },
      now,
    })

    const photo = formData.get(`exercisePhoto:${exerciseId}`)
    if (isUploadedFile(photo)) {
      await uploadEquipmentPhoto(db, {
        uploadsDir: getUploadsDir(),
        userId,
        exerciseId,
        contentType: photo.type,
        bytes: new Uint8Array(await photo.arrayBuffer()),
        now,
      })
    }
  }

  await reorderDraftExercises(db, {
    userId,
    planId,
    exerciseIds,
    now,
  })
}

async function saveDraftAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await saveDraftFromFormData(getDatabase(), user.id, planId, formData, new Date())

  revalidatePath(`/admin/plans/${planId}`)
}

async function publishPlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')
  const db = getDatabase()
  const now = new Date()

  await saveDraftFromFormData(db, user.id, planId, formData, now)

  const detail = await getAdminPlan(db, { userId: user.id, planId })
  const publicationState = getPublicationState({
    archived: detail?.archived ?? false,
    draftData: detail?.draft?.data ?? null,
    latestRevisionData: detail?.latestRevision?.data ?? null,
  })

  if (publicationState === 'published' && detail?.latestRevisionNumber) {
    redirect(`/admin/plans/${planId}?published=${detail.latestRevisionNumber}`)
  }

  const revision = await publishDraftPlan(db, {
    userId: user.id,
    planId,
    now,
  })

  revalidatePath(`/admin/plans/${planId}`)
  revalidatePath('/admin/plans')
  revalidatePath('/admin')
  redirect(`/admin/plans/${planId}?published=${revision.revisionNumber}`)
}

async function addExerciseAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')
  const exerciseId = `exercise_${randomUUID()}`

  await addDraftExercise(getDatabase(), {
    userId: user.id,
    planId,
    exerciseId,
    name: getRequiredString(formData, 'exerciseName'),
    category: MuscleCategorySchema.parse(getRequiredString(formData, 'exerciseCategory')),
    now: new Date(),
  })

  revalidatePath(`/admin/plans/${planId}`)
  redirect(`/admin/plans/${planId}?added=${exerciseId}`)
}

async function removeExerciseAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')
  const exerciseId = getRequiredString(formData, 'removeExerciseId')

  await removeDraftExercise(getDatabase(), {
    userId: user.id,
    planId,
    exerciseId,
    now: new Date(),
  })

  revalidatePath(`/admin/plans/${planId}`)
}

async function archivePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await archivePlan(getDatabase(), {
    userId: user.id,
    planId,
    now: new Date(),
  })

  revalidatePath('/admin/plans')
  redirect('/admin/plans')
}

async function restorePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await restoreArchivedPlan(getDatabase(), {
    userId: user.id,
    planId,
    now: new Date(),
  })

  revalidatePath(`/admin/plans/${planId}`)
}

async function deletePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await deletePlanPermanently(getDatabase(), {
    userId: user.id,
    planId,
  })

  revalidatePath('/admin/plans')
  redirect('/admin/plans')
}

async function requireAdmin(): Promise<{ id: string }> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  return user
}

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

function getFormDataValues(formData: FormData, key: string): FormDataEntryValue[] {
  return formData.getAll(key)
}

function getStringValues(formData: FormData, key: string): string[] {
  const values = getFormDataValues(formData, key)

  return values.map((_, index) => getRequiredStringAt(values, key, index))
}

function getRequiredStringAt(values: FormDataEntryValue[], key: string, index: number): string {
  const value = values[index]

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key}[${index}] is required`)
  }

  return value.trim()
}

function getRequiredNumberAt(values: FormDataEntryValue[], key: string, index: number): number {
  const value = Number(getRequiredStringAt(values, key, index))

  if (!Number.isFinite(value)) {
    throw new Error(`${key}[${index}] must be a number`)
  }

  return value
}

function isUploadedFile(value: FormDataEntryValue | null | undefined): value is File {
  return value instanceof File && value.size > 0
}
