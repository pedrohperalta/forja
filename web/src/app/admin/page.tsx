import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminCard, AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { listAdminPlans, type AdminPlanListItem } from '@/server/services/plans/planService'

type AdminDashboardPlan = Pick<
  AdminPlanListItem,
  'draftName' | 'latestRevisionNumber' | 'archived'
> & {
  plan: {
    id: string
    label: string
  }
}

type AdminShellProps = {
  plans?: AdminDashboardPlan[]
}

export function AdminShell({ plans = [] }: AdminShellProps): ReactElement {
  const activePlans = plans.filter((plan) => !plan.archived)
  const draftOnlyPlans = plans.filter(
    (plan) => !plan.archived && plan.latestRevisionNumber === null,
  )
  const primaryDraft = draftOnlyPlans[0]
  const hasPendingPublication = draftOnlyPlans.length > 0
  const hasPlans = activePlans.length > 0
  const focusTitle = getFocusTitle({
    hasPendingPublication,
    hasPlans,
  })
  const focusCopy = getFocusCopy({
    hasPendingPublication,
    hasPlans,
    primaryDraft,
  })

  return (
    <AdminFrame
      active="overview"
      eyebrow="FORJA ADMIN"
      title="Visão geral"
      subtitle="Escolha uma próxima ação. O detalhe fica nas telas de planos e importação."
    >
      <section className="admin-simple-dashboard" aria-label="Resumo do admin">
        <section className="admin-summary-strip" aria-label="Resumo dos treinos">
          <SummaryItem label="Planos de treino" value={String(activePlans.length)} />
          <SummaryItem label="Publicação pendente" value={String(draftOnlyPlans.length)} />
          <SummaryItem
            label="Publicado no app"
            value={String(activePlans.length - draftOnlyPlans.length)}
          />
        </section>

        <AdminCard accent className="admin-focus-panel">
          <div className="admin-focus-copy">
            <StatusPill tone={hasPendingPublication ? 'warning' : 'accent'}>
              Próxima ação
            </StatusPill>
            <h2 className="admin-focus-title admin-display">{focusTitle}</h2>
            <p>{focusCopy}</p>
          </div>

          <div className="admin-focus-actions">
            {hasPendingPublication && primaryDraft ? (
              <Link
                className="admin-primary-button bg-accent"
                href={`/admin/plans/${primaryDraft.plan.id}`}
              >
                Revisar rascunho
              </Link>
            ) : (
              <Link className="admin-primary-button bg-accent" href="/admin/plans/new">
                Novo plano
              </Link>
            )}
            <Link className="admin-secondary-button" href="/admin/import">
              Importar ficha
            </Link>
          </div>
        </AdminCard>
      </section>
    </AdminFrame>
  )
}

function getFocusTitle({
  hasPendingPublication,
  hasPlans,
}: {
  hasPendingPublication: boolean
  hasPlans: boolean
}): string {
  if (hasPendingPublication) {
    return 'Publicar rascunho'
  }

  return hasPlans ? 'Treinos prontos' : 'Começar treinos'
}

function getFocusCopy({
  hasPendingPublication,
  hasPlans,
  primaryDraft,
}: {
  hasPendingPublication: boolean
  hasPlans: boolean
  primaryDraft: AdminDashboardPlan | undefined
}): string {
  if (hasPendingPublication) {
    return `${primaryDraft?.draftName ?? primaryDraft?.plan.label ?? 'Um plano'} ainda não aparece no app. Revise e publique quando estiver pronto.`
  }

  if (hasPlans) {
    return 'Todos os planos ativos já têm versão publicada. Crie um novo rascunho ou importe uma ficha quando houver conteúdo novo.'
  }

  return 'Ainda não há treinos cadastrados. Crie um plano novo ou importe uma ficha para começar.'
}

function SummaryItem({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="admin-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default async function AdminPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const plans = await listAdminPlans(getDatabase(), { userId: user.id })

  return <AdminShell plans={plans} />
}
