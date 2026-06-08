import { MuscleCategorySchema, type Plan } from '@forja/domain'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import {
  archivePlan,
  getAdminPlan,
  publishDraftPlan,
  reorderDraftExercises,
  updateDraftExercise,
  updateDraftPlanDetails,
} from '@/server/services/plans/planService'

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
      <main>
        <h1>{plan.plan.label}</h1>
        <p>Rascunho não encontrado.</p>
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>{draft.data.name}</h1>
        <p>{draft.data.focus}</p>
        <span>
          {plan.latestRevisionNumber
            ? `Rev. ${plan.latestRevisionNumber}`
            : 'Rascunho'}
        </span>
        {plan.archived ? <span>Arquivado</span> : null}
      </header>
      <section aria-label="Dados do plano">
        <form action={updatePlanDetailsAction}>
          <input name="planId" type="hidden" value={plan.plan.id} />
          <label>
            Rótulo
            <input name="label" required defaultValue={draft.data.label} />
          </label>
          <label>
            Nome
            <input name="name" required defaultValue={draft.data.name} />
          </label>
          <label>
            Foco
            <input name="focus" required defaultValue={draft.data.focus} />
          </label>
          <button disabled={plan.archived} type="submit">
            Salvar plano
          </button>
        </form>
      </section>
      <section aria-label="Exercícios">
        <h2>Exercícios</h2>
        {draft.data.exercises.map((exercise, index) => (
          <article key={exercise.id}>
            <form action={updateExerciseAction}>
              <input name="planId" type="hidden" value={plan.plan.id} />
              <input name="exerciseId" type="hidden" value={exercise.id} />
              <label>
                Nome
                <input name="name" required defaultValue={exercise.name} />
              </label>
              <label>
                Categoria
                <select name="category" defaultValue={exercise.category}>
                  {MuscleCategorySchema.options.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Equipamento
                <input
                  name="equipment"
                  required
                  defaultValue={exercise.equipment}
                />
              </label>
              <label>
                Repetições
                <input name="reps" required defaultValue={exercise.reps} />
              </label>
              <label>
                Séries
                <input
                  min={1}
                  name="sets"
                  required
                  type="number"
                  defaultValue={exercise.sets}
                />
              </label>
              <label>
                Descanso
                <input
                  min={0}
                  name="restSeconds"
                  required
                  type="number"
                  defaultValue={exercise.restSeconds}
                />
              </label>
              <button disabled={plan.archived} type="submit">
                Salvar exercício
              </button>
            </form>
            <form action={reorderExerciseAction}>
              <input name="planId" type="hidden" value={plan.plan.id} />
              <input name="exerciseId" type="hidden" value={exercise.id} />
              <input
                name="direction"
                type="hidden"
                value={index === 0 ? 'down' : 'up'}
              />
              <input
                name="exerciseIds"
                type="hidden"
                value={draft.data.exercises
                  .map((draftExercise) => draftExercise.id)
                  .join(',')}
              />
              <button disabled={plan.archived} type="submit">
                {index === 0 ? 'Mover para baixo' : 'Mover para cima'}
              </button>
            </form>
          </article>
        ))}
      </section>
      <section aria-label="Publicação">
        <form action={publishPlanAction}>
          <input name="planId" type="hidden" value={plan.plan.id} />
          <button disabled={plan.archived} type="submit">
            Publicar
          </button>
        </form>
        <form action={archivePlanAction}>
          <input name="planId" type="hidden" value={plan.plan.id} />
          <button disabled={plan.archived} type="submit">
            Arquivar
          </button>
        </form>
      </section>
    </main>
  )
}

export default async function PlanPage({
  params,
}: PlanPageProps): Promise<ReactElement> {
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

async function updatePlanDetailsAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await updateDraftPlanDetails(getDatabase(), {
    userId: user.id,
    planId,
    label: getRequiredString(formData, 'label'),
    name: getRequiredString(formData, 'name'),
    focus: getRequiredString(formData, 'focus'),
    now: new Date(),
  })

  revalidatePath(`/admin/plans/${planId}`)
}

async function updateExerciseAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')

  await updateDraftExercise(getDatabase(), {
    userId: user.id,
    planId,
    exerciseId: getRequiredString(formData, 'exerciseId'),
    exercise: {
      name: getRequiredString(formData, 'name'),
      category: MuscleCategorySchema.parse(getRequiredString(formData, 'category')),
      equipment: getRequiredString(formData, 'equipment'),
      reps: getRequiredString(formData, 'reps'),
      sets: getRequiredNumber(formData, 'sets'),
      restSeconds: getRequiredNumber(formData, 'restSeconds'),
    },
    now: new Date(),
  })

  revalidatePath(`/admin/plans/${planId}`)
}

async function reorderExerciseAction(formData: FormData): Promise<void> {
  'use server'

  const user = await requireAdmin()
  const planId = getRequiredString(formData, 'planId')
  const exerciseId = getRequiredString(formData, 'exerciseId')
  const direction = getRequiredString(formData, 'direction')
  const exerciseIds = getRequiredString(formData, 'exerciseIds').split(',')
  const currentIndex = exerciseIds.indexOf(exerciseId)
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

  if (currentIndex !== -1 && targetIndex >= 0 && targetIndex < exerciseIds.length) {
    const nextExerciseIds = [...exerciseIds]
    const currentId = nextExerciseIds[currentIndex]
    const targetId = nextExerciseIds[targetIndex]

    if (currentId && targetId) {
      nextExerciseIds[currentIndex] = targetId
      nextExerciseIds[targetIndex] = currentId
      await reorderDraftExercises(getDatabase(), {
        userId: user.id,
        planId,
        exerciseIds: nextExerciseIds,
        now: new Date(),
      })
    }
  }

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

function getRequiredNumber(formData: FormData, key: string): number {
  const value = Number(getRequiredString(formData, key))

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a number`)
  }

  return value
}
