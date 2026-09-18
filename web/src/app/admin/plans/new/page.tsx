import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'
import Link from 'next/link'

import { AdminSubmitButton } from '@/components/admin/AdminSubmitButton'
import { AdminCard, AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { createDraftPlan, duplicatePlan, listAdminPlans } from '@/server/services/plans/planService'

type HubPlanOption = {
  plan: {
    id: string
    label: string
  }
  draftName: string | null
}

type NewPlanViewProps = {
  error?: string | undefined
  plans?: HubPlanOption[]
}

type NewPlanPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export function NewPlanView({ error, plans = [] }: NewPlanViewProps): ReactElement {
  return (
    <AdminFrame
      active="plans"
      eyebrow="NOVO PLANO"
      title="Como você quer começar?"
      subtitle="Todo plano nasce como rascunho — e nada aparece no app até publicar."
      action={<StatusPill tone="warning">Abre como rascunho</StatusPill>}
    >
      {error ? (
        <div className="admin-error-banner" role="alert">
          <strong>Não foi possível criar o plano</strong>
          <p>Revise os dados e tente novamente.</p>
        </div>
      ) : null}

      <div className="admin-hub-cards">
        <AdminCard className="admin-hubcard">
          <BlankPlanIcon />
          <h2 className="admin-hubcard-title admin-display">Em branco</h2>
          <p className="admin-muted">
            Abra o editor e monte do zero. Séries, descanso e equipamento têm padrões prontos.
          </p>
          <form action={createBlankPlanAction} className="admin-hubcard-form">
            <button className="admin-primary-button" type="submit">
              Criar e abrir editor
            </button>
          </form>
        </AdminCard>

        <AdminCard accent className="admin-hubcard">
          <PhotoPlanIcon />
          <h2 className="admin-hubcard-title admin-display">Da foto da ficha</h2>
          <p className="admin-muted">
            Cada foto vira uma ficha separada. A IA extrai e você confere no editor.
          </p>
          <div className="admin-hubcard-form">
            <Link className="admin-secondary-button" href="/admin/import">
              Enviar fotos
            </Link>
          </div>
        </AdminCard>

        <AdminCard className="admin-hubcard">
          <DuplicatePlanIcon />
          <h2 className="admin-hubcard-title admin-display">Duplicar plano</h2>
          <p className="admin-muted">Copie um plano ativo como ponto de partida e ajuste a variação.</p>
          {plans.length === 0 ? (
            <p className="admin-muted admin-hubcard-empty">Nenhum plano ativo para duplicar ainda.</p>
          ) : (
            <form action={duplicatePlanAction} className="admin-hubcard-form">
              <select aria-label="Plano para duplicar" className="admin-input" name="sourcePlanId" required>
                {plans.map((item) => (
                  <option key={item.plan.id} value={item.plan.id}>
                    {item.draftName ?? item.plan.label}
                  </option>
                ))}
              </select>
              <AdminSubmitButton
                className="admin-secondary-button"
                spinnerTone="light"
              >
                Duplicar e abrir editor
              </AdminSubmitButton>
            </form>
          )}
        </AdminCard>
      </div>
    </AdminFrame>
  )
}

function BlankPlanIcon(): ReactElement {
  return (
    <svg aria-hidden="true" className="admin-hubcard-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function PhotoPlanIcon(): ReactElement {
  return (
    <svg aria-hidden="true" className="admin-hubcard-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function DuplicatePlanIcon(): ReactElement {
  return (
    <svg aria-hidden="true" className="admin-hubcard-icon" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 9h10v10H9zM5 15V5h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
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
  const plans = await listAdminPlans(getDatabase(), { userId: user.id })

  return (
    <NewPlanView
      error={error}
      plans={plans.map((item) => ({ plan: item.plan, draftName: item.draftName }))}
    />
  )
}

async function createBlankPlanAction(): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const planId = `plan_${randomUUID()}`

  try {
    await createDraftPlan(getDatabase(), {
      userId: user.id,
      planId,
      label: 'Plano sem título',
      name: 'Plano sem título',
      focus: 'A definir',
      exercises: [],
      now: new Date(),
    })
  } catch {
    redirect('/admin/plans/new?error=create_failed')
  }

  revalidatePath('/admin/plans')

  redirect(`/admin/plans/${planId}?rename=1`)
}

async function duplicatePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const sourcePlanId = getRequiredString(formData, 'sourcePlanId')
  let copyPlanId: string

  try {
    copyPlanId = (await duplicatePlan(getDatabase(), {
      userId: user.id,
      sourcePlanId,
      now: new Date(),
    })).data.id
  } catch {
    redirect('/admin/plans/new?error=create_failed')
  }

  revalidatePath('/admin/plans')

  redirect(`/admin/plans/${copyPlanId}?rename=1`)
}

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}
