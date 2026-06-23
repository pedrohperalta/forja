import { MuscleCategorySchema, type Plan } from '@forja/domain'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminPlanDraftForm } from '@/components/admin/AdminPlanDraftForm'
import { AdminCard, AdminFrame, AdminTag, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import {
  archivePlan,
  deletePlanPermanently,
  getAdminPlan,
  publishDraftPlan,
  reorderDraftExercises,
  restoreArchivedPlan,
  updateDraftExercise,
  updateDraftPlanDetails,
} from '@/server/services/plans/planService'
import { getUploadsDir, uploadEquipmentPhoto } from '@/server/services/photos/equipmentPhotoService'

type PlanEditorViewProps = {
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
}

type PlanPageProps = {
  params: Promise<{
    planId: string
  }>
}

export function PlanEditorView({ plan }: PlanEditorViewProps): ReactElement {
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
  const publishButtonLabel = getPublishButtonLabel(publicationState)
  const canPublish =
    publicationState === 'pending-changes' || publicationState === 'unpublished-draft'

  return (
    <AdminFrame
      active="plans"
      eyebrow="EDITOR DE PLANO"
      title={draft.data.name}
      subtitle={draft.data.focus}
      action={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
    >
      <section className="admin-editor-next-step" aria-label="Próxima ação">
        <div>
          <p className="admin-section-label">Próxima ação</p>
          <h2 className="admin-panel-title admin-display">{status.label}</h2>
          <p className="admin-muted">{status.description}</p>
        </div>
        <div>
          <div className="admin-publication-meta">
            <AdminTag>
              {plan.latestRevisionNumber ? `Rev. ${plan.latestRevisionNumber}` : 'Sem revisão'}
            </AdminTag>
            <AdminTag>{draft.data.exercises.length} exercícios</AdminTag>
          </div>
          <p className="admin-muted admin-editor-next-copy">{status.publishDescription}</p>
          <div className="admin-actions-row admin-actions-row-tight">
            {canPublish ? (
              <form action={publishPlanAction}>
                <input name="planId" type="hidden" value={plan.plan.id} />
                <button className="admin-primary-button bg-accent" type="submit">
                  {publishButtonLabel}
                </button>
              </form>
            ) : publicationState === 'archived' ? (
              <form action={restorePlanAction}>
                <input name="planId" type="hidden" value={plan.plan.id} />
                <button className="admin-primary-button bg-accent" type="submit">
                  Restaurar para editar
                </button>
              </form>
            ) : (
              <button className="admin-secondary-button" disabled type="button">
                {publishButtonLabel}
              </button>
            )}
          </div>
        </div>
      </section>

      <AdminPlanDraftForm
        archived={plan.archived}
        categoryOptions={MuscleCategorySchema.options}
        draft={draft.data}
        planId={plan.plan.id}
        saveDraftAction={saveDraftAction}
      />

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

type PublicationState = 'archived' | 'published' | 'pending-changes' | 'unpublished-draft'

function getPublicationState(input: {
  archived: boolean
  draftData: Plan
  latestRevisionData: Plan | null
}): PublicationState {
  if (input.archived) {
    return 'archived'
  }

  if (!input.latestRevisionData) {
    return 'unpublished-draft'
  }

  if (stableStringify(input.draftData) === stableStringify(input.latestRevisionData)) {
    return 'published'
  }

  return 'pending-changes'
}

function getPublicationStatus(state: PublicationState): {
  label: string
  description: string
  publishDescription: string
  tone: 'accent' | 'warning' | 'danger'
} {
  if (state === 'archived') {
    return {
      label: 'Arquivado',
      description: 'Não aparece no app.',
      publishDescription: 'Plano arquivado. Não aparece no app e não pode ser editado.',
      tone: 'danger',
    }
  }

  if (state === 'published') {
    return {
      label: 'Publicado no app',
      description: 'Esta versão já está publicada no app.',
      publishDescription:
        'Esta versão já está publicada no app. Edite algum campo para criar uma nova revisão.',
      tone: 'accent',
    }
  }

  if (state === 'pending-changes') {
    return {
      label: 'Alterações em rascunho',
      description:
        'Existe uma revisão publicada, mas este draft precisa ser publicado para chegar ao app.',
      publishDescription:
        'Publique a revisão para atualizar o app. Até lá, as alterações continuam salvas como draft.',
      tone: 'warning',
    }
  }

  return {
    label: 'Rascunho não publicado',
    description: 'Ainda não aparece no app.',
    publishDescription:
      'Publique para aparecer no app. Até lá, as alterações continuam salvas como draft.',
    tone: 'warning',
  }
}

function getPublishButtonLabel(state: PublicationState): string {
  if (state === 'archived') {
    return 'Plano arquivado'
  }

  if (state === 'published') {
    return 'Publicado'
  }

  if (state === 'pending-changes') {
    return 'Publicar revisão'
  }

  return 'Publicar no app'
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

export default async function PlanPage({ params }: PlanPageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { planId } = await params
  const plan = await getAdminPlan(getDatabase(), { userId: user.id, planId })

  if (!plan) {
    notFound()
  }

  return <PlanEditorView plan={plan} />
}

async function saveDraftAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')
  const exerciseIds = getStringValues(formData, 'exerciseId')
  const exerciseNames = getFormDataValues(formData, 'exerciseName')
  const exerciseCategories = getFormDataValues(formData, 'exerciseCategory')
  const exerciseEquipment = getFormDataValues(formData, 'exerciseEquipment')
  const exerciseReps = getFormDataValues(formData, 'exerciseReps')
  const exerciseSets = getFormDataValues(formData, 'exerciseSets')
  const exerciseRestSeconds = getFormDataValues(formData, 'exerciseRestSeconds')
  const now = new Date()
  const db = getDatabase()

  await updateDraftPlanDetails(db, {
    userId: user.id,
    planId,
    label: getRequiredString(formData, 'label'),
    name: getRequiredString(formData, 'name'),
    focus: getRequiredString(formData, 'focus'),
    now,
  })

  for (const [index, exerciseId] of exerciseIds.entries()) {
    await updateDraftExercise(db, {
      userId: user.id,
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
        userId: user.id,
        exerciseId,
        contentType: photo.type,
        bytes: new Uint8Array(await photo.arrayBuffer()),
        now,
      })
    }
  }

  await reorderDraftExercises(db, {
    userId: user.id,
    planId,
    exerciseIds,
    now,
  })

  revalidatePath(`/admin/plans/${planId}`)
}

async function publishPlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await publishDraftPlan(getDatabase(), {
    userId: user.id,
    planId,
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
