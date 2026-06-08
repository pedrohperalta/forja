import { randomUUID } from 'node:crypto'

import { MuscleCategorySchema } from '@forja/domain'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { createDraftPlan } from '@/server/services/plans/planService'

export function NewPlanView(): ReactElement {
  return (
    <main>
      <h1>Novo plano</h1>
      <form action={createPlanAction}>
        <label>
          Identificador
          <input name="planId" placeholder="plan_a" required />
        </label>
        <label>
          Rótulo
          <input name="label" placeholder="A" required />
        </label>
        <label>
          Nome
          <input name="name" placeholder="Treino A" required />
        </label>
        <label>
          Foco
          <input name="focus" placeholder="Peito / Ombros / Tríceps" required />
        </label>
        <fieldset>
          <legend>Exercício inicial</legend>
          <label>
            Nome
            <input name="exerciseName" placeholder="Supino Reto" required />
          </label>
          <label>
            Categoria
            <select name="exerciseCategory" defaultValue="Peito">
              {MuscleCategorySchema.options.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Equipamento
            <input name="exerciseEquipment" placeholder="Barra" required />
          </label>
          <label>
            Repetições
            <input name="exerciseReps" placeholder="10-12" required />
          </label>
          <label>
            Séries
            <input min={1} name="exerciseSets" required type="number" />
          </label>
          <label>
            Descanso
            <input min={0} name="exerciseRestSeconds" required type="number" />
          </label>
        </fieldset>
        <button type="submit">Criar rascunho</button>
      </form>
    </main>
  )
}

export default async function NewPlanPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <NewPlanView />
}

async function createPlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const now = new Date()
  const planId = getRequiredString(formData, 'planId')
  const exerciseId = `exercise_${randomUUID()}`

  await createDraftPlan(getDatabase(), {
    userId: user.id,
    planId,
    label: getRequiredString(formData, 'label'),
    name: getRequiredString(formData, 'name'),
    focus: getRequiredString(formData, 'focus'),
    exercises: [
      {
        id: exerciseId,
        name: getRequiredString(formData, 'exerciseName'),
        category: MuscleCategorySchema.parse(
          getRequiredString(formData, 'exerciseCategory'),
        ),
        equipment: getRequiredString(formData, 'exerciseEquipment'),
        reps: getRequiredString(formData, 'exerciseReps'),
        sets: getRequiredNumber(formData, 'exerciseSets'),
        restSeconds: getRequiredNumber(formData, 'exerciseRestSeconds'),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    now,
  })

  redirect(`/admin/plans/${planId}`)
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
