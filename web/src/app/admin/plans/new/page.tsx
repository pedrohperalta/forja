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

const DEFAULT_PLAN_FOCUS = 'A definir'

export function NewPlanView({ error }: NewPlanViewProps = {}): ReactElement {
  return (
    <AdminFrame
      active="plans"
      eyebrow="NOVO PLANO"
      title="Novo plano"
      subtitle="Um nome basta. Os exercícios você monta no editor — e nada aparece no app até publicar."
      action={<StatusPill tone="warning">Rascunho</StatusPill>}
    >
      <form action={createPlanAction} className="admin-linear-flow">
        <AdminCard accent className="admin-linear-panel">
          {error ? (
            <div className="admin-error-banner" role="alert">
              <strong>Não foi possível criar o plano</strong>
              <p>Revise os dados e tente novamente.</p>
            </div>
          ) : null}

          <div className="admin-linear-section">
            <p className="admin-section-title">Dados do plano</p>
            <p className="admin-muted">
              O rótulo (A, B, C…) é gerado a partir do nome. Foco e exercícios você define no
              editor.
            </p>
          </div>

          <div className="admin-linear-fields">
            <AdminField label="Nome">
              <input className="admin-input" name="name" placeholder="Treino A" required />
            </AdminField>
          </div>

          <details className="admin-exercise-advanced">
            <summary>Começar com foco definido</summary>
            <div className="admin-linear-fields">
              <AdminField label="Foco">
                <input
                  className="admin-input"
                  name="focus"
                  placeholder="Peito / Ombros / Tríceps"
                />
              </AdminField>
            </div>
          </details>

          <div className="admin-linear-footer">
            <p>Criar abre o editor com o plano em branco. Nada aparece no app até publicar.</p>
            <button className="admin-primary-button bg-accent" type="submit">
              Criar e abrir editor
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

  const name = getRequiredString(formData, 'name')
  const focus = getOptionalString(formData, 'focus') ?? DEFAULT_PLAN_FOCUS
  const planId = createPlanId(name)

  try {
    await createDraftPlan(getDatabase(), {
      userId: user.id,
      planId,
      label: name,
      name,
      focus,
      exercises: [],
      now: new Date(),
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

  return slug ? `plan_${slug}` : `plan_${crypto.randomUUID()}`
}

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}

function getOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  return value.trim()
}
