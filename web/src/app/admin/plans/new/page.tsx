import { randomUUID } from 'node:crypto'

import { MuscleCategorySchema } from '@forja/domain'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminCard, AdminField, AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { createDraftPlan } from '@/server/services/plans/planService'

type NewPlanViewProps = {
  error?: string | undefined
}

type NewPlanPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export function NewPlanView({ error }: NewPlanViewProps = {}): ReactElement {
  return (
    <AdminFrame
      active="plans"
      eyebrow="NOVO PLANO"
      title="Novo plano"
      subtitle="Crie a ficha inicial em campos estruturados. Ela nasce como rascunho e só aparece no app depois da publicação."
      action={<StatusPill tone="warning">Salvo como rascunho</StatusPill>}
    >
      <form action={createPlanAction} className="admin-linear-flow">
        <AdminCard accent className="admin-linear-panel">
          {error ? (
            <div className="admin-error-banner" role="alert">
              <strong>Não foi possível criar o plano</strong>
              <p>Revise os dados e tente novamente.</p>
            </div>
          ) : null}

          <ol className="admin-stepper" aria-label="Etapas do novo plano">
            <li data-state="active">
              <span>1</span>
              <strong>Etapa 1 de 2</strong>
            </li>
            <li>
              <span>2</span>
              <strong>Publicar no app</strong>
            </li>
          </ol>

          <div className="admin-linear-section">
            <p className="admin-section-title">Dados do plano</p>
            <p className="admin-muted">
              Comece pelo essencial. O identificador técnico será criado automaticamente.
            </p>
          </div>

          <div className="admin-linear-fields">
            <AdminField label="Rótulo">
              <input className="admin-input" name="label" placeholder="A" required />
            </AdminField>
            <AdminField label="Nome">
              <input className="admin-input" name="name" placeholder="Treino A" required />
            </AdminField>
            <AdminField label="Foco">
              <input
                className="admin-input"
                name="focus"
                placeholder="Peito / Ombros / Tríceps"
                required
              />
            </AdminField>
          </div>

          <div className="admin-linear-section">
            <p className="admin-section-title">Exercício inicial</p>
            <p className="admin-muted">
              Adicione só o primeiro movimento. Detalhes finos ficam na tela de edição.
            </p>
            <div className="admin-linear-fields">
              <AdminField label="Nome">
                <input
                  className="admin-input"
                  name="exerciseName"
                  placeholder="Supino Reto"
                  required
                />
              </AdminField>
              <AdminField label="Categoria">
                <select className="admin-input" name="exerciseCategory" defaultValue="Peito">
                  {MuscleCategorySchema.options.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </AdminField>
            </div>
          </div>

          <details className="admin-exercise-advanced">
            <summary>Padrões iniciais</summary>
            <div className="admin-linear-fields">
              <AdminField label="Equipamento">
                <input
                  className="admin-input"
                  name="exerciseEquipment"
                  required
                  defaultValue="A definir"
                />
              </AdminField>
              <AdminField label="Repetições">
                <input className="admin-input" name="exerciseReps" required defaultValue="10-12" />
              </AdminField>
              <AdminField label="Séries">
                <input
                  className="admin-input"
                  min={1}
                  name="exerciseSets"
                  required
                  type="number"
                  defaultValue={3}
                />
              </AdminField>
              <AdminField label="Descanso">
                <input
                  className="admin-input"
                  min={0}
                  name="exerciseRestSeconds"
                  required
                  type="number"
                  defaultValue={60}
                />
              </AdminField>
            </div>
          </details>

          <div className="admin-linear-footer">
            <p>Criar agora salva um draft. Publique na tela do plano para liberar no app.</p>
            <button className="admin-primary-button bg-accent" type="submit">
              Criar rascunho
            </button>
          </div>
        </AdminCard>
      </form>
    </AdminFrame>
  )
}

export default async function NewPlanPage({
  searchParams,
}: NewPlanPageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { error } = await searchParams

  return <NewPlanView error={error} />
}

async function createPlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const now = new Date()
  const label = getRequiredString(formData, 'label')
  const planId = createPlanId(label)
  const exerciseId = `exercise_${randomUUID()}`

  try {
    await createDraftPlan(getDatabase(), {
      userId: user.id,
      planId,
      label,
      name: getRequiredString(formData, 'name'),
      focus: getRequiredString(formData, 'focus'),
      exercises: [
        {
          id: exerciseId,
          name: getRequiredString(formData, 'exerciseName'),
          category: MuscleCategorySchema.parse(getRequiredString(formData, 'exerciseCategory')),
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
  } catch {
    redirect('/admin/plans/new?error=create_failed')
  }

  redirect(`/admin/plans/${planId}`)
}

function createPlanId(label: string): string {
  const slug = label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return slug ? `plan_${slug}` : `plan_${randomUUID()}`
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
