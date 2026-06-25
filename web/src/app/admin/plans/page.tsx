import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminCard, AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import {
  deletePlanPermanently,
  listAdminPlans,
  restoreArchivedPlan,
  type AdminPlanListItem,
} from '@/server/services/plans/planService'

type PlanListItemViewModel = Pick<
  AdminPlanListItem,
  'draftFocus' | 'draftName' | 'latestRevisionNumber' | 'archived'
> & {
  plan: {
    id: string
    label: string
  }
}

type PlanListViewProps = {
  plans: PlanListItemViewModel[]
}

export function PlanListView({ plans }: PlanListViewProps): ReactElement {
  const activePlans = plans.filter((plan) => !plan.archived)
  const archivedPlans = plans.filter((plan) => plan.archived)

  return (
    <AdminFrame
      active="plans"
      eyebrow="GESTÃO DE TREINOS"
      title="Treinos"
      subtitle="Revise rascunhos e publique somente quando a ficha estiver pronta para aparecer no app."
      action={
        <Link className="admin-primary-button bg-accent" href="/admin/plans/new">
          Novo plano
        </Link>
      }
    >
      <section className="admin-section" aria-label="Planos cadastrados">
        {plans.length === 0 ? (
          <AdminCard accent className="admin-empty-state">
            <p className="admin-section-title">Nenhum plano cadastrado</p>
            <p className="admin-muted">
              Crie a primeira ficha estruturada. Ela nasce como draft e só aparece no app depois
              da publicação.
            </p>
            <Link className="admin-primary-button bg-accent" href="/admin/plans/new">
              Criar primeiro plano
            </Link>
          </AdminCard>
        ) : (
          <div className="admin-plan-sections">
            <PlanSection items={activePlans} title="Planos ativos" />
            {archivedPlans.length > 0 ? (
              <PlanSection archived items={archivedPlans} title="Arquivados" />
            ) : null}
          </div>
        )}
      </section>
    </AdminFrame>
  )
}

function PlanSection({
  archived = false,
  items,
  title,
}: {
  archived?: boolean
  items: PlanListItemViewModel[]
  title: string
}): ReactElement {
  return (
    <section className="admin-plan-section" aria-label={title}>
      <div className="admin-panel-header">
        <h2 className="admin-section-title">{title}</h2>
        <span className="admin-chip">{items.length} planos</span>
      </div>
      {items.length === 0 ? (
        <AdminCard className="admin-empty-state">
          <p className="admin-muted">
            {archived
              ? 'Nenhum plano arquivado.'
              : 'Nenhum plano ativo. Crie ou importe uma ficha para continuar.'}
          </p>
        </AdminCard>
      ) : (
        <div className="admin-grid">
          {items.map((item) => (
            <PlanCard item={item} key={item.plan.id} />
          ))}
        </div>
      )}
    </section>
  )
}

function PlanCard({ item }: { item: PlanListItemViewModel }): ReactElement {
  return (
    <AdminCard
      accent={!item.archived}
      className={`admin-plan-card${item.archived ? ' admin-plan-card-archived' : ''}`}
    >
      <div className="admin-plan-card-shell">
        <header className="admin-plan-card-header">
          <div className="admin-plan-title-block">
            <span className="admin-chip admin-plan-label">{item.plan.label}</span>
            <h2 className="admin-plan-title">
              <Link href={`/admin/plans/${item.plan.id}`}>{item.draftName ?? item.plan.label}</Link>
            </h2>
            <p className="admin-plan-focus">{item.draftFocus ?? 'Sem foco definido'}</p>
          </div>
          {item.archived ? (
            <StatusPill tone="danger">Arquivado</StatusPill>
          ) : item.latestRevisionNumber ? (
            <StatusPill tone="accent">Publicado no app</StatusPill>
          ) : (
            <StatusPill tone="warning">Rascunho não publicado</StatusPill>
          )}
        </header>

        {item.archived ? (
          <dl className="admin-plan-card-meta">
            <div>
              <dt>Aplicativo</dt>
              <dd>Não aparece no app</dd>
            </div>
          </dl>
        ) : null}

        <div className="admin-plan-card-actions">
          <Link className="admin-secondary-button admin-compact-button" href={`/admin/plans/${item.plan.id}`}>
            {getPlanActionLabel(item)}
          </Link>
          {item.archived ? (
            <form action={restorePlanAction}>
              <input name="planId" type="hidden" value={item.plan.id} />
              <button
                aria-label="Restaurar para editar"
                className="admin-primary-button admin-compact-button bg-accent"
                type="submit"
              >
                Restaurar
              </button>
            </form>
          ) : null}
          {item.archived ? <PermanentDeleteForm planId={item.plan.id} /> : null}
        </div>
      </div>
    </AdminCard>
  )
}

function PermanentDeleteForm({ planId }: { planId: string }): ReactElement {
  return (
    <details className="admin-permanent-delete">
      <summary aria-label="Excluir definitivamente">Excluir</summary>
      <p className="admin-muted">
        Esta ação apaga o plano, rascunhos e revisões. Não dá para desfazer.
      </p>
      <form action={deletePlanAction}>
        <input name="planId" type="hidden" value={planId} />
        <button className="admin-danger-button" type="submit">
          Confirmar exclusão
        </button>
      </form>
    </details>
  )
}

function getPlanActionLabel(item: PlanListItemViewModel): string {
  if (item.archived) {
    return 'Ver arquivado'
  }

  if (!item.latestRevisionNumber) {
    return 'Revisar e publicar'
  }

  return 'Editar plano'
}

export default async function AdminPlansPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const plans = await listAdminPlans(getDatabase(), { userId: user.id, includeArchived: true })

  return <PlanListView plans={plans} />
}

async function deletePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  await deletePlanPermanently(getDatabase(), {
    userId: user.id,
    planId: getRequiredString(formData, 'planId'),
  })

  revalidatePath('/admin/plans')
}

async function restorePlanAction(formData: FormData): Promise<void> {
  'use server'

  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const planId = getRequiredString(formData, 'planId')

  await restoreArchivedPlan(getDatabase(), {
    userId: user.id,
    planId,
    now: new Date(),
  })

  revalidatePath('/admin/plans')
  redirect(`/admin/plans/${planId}`)
}

function getRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key)

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`)
  }

  return value.trim()
}
