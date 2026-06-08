import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import {
  listAdminPlans,
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
  return (
    <main>
      <nav>
        <Link href="/admin">Admin</Link>
      </nav>
      <header>
        <h1>Planos</h1>
        <Link href="/admin/plans/new">Novo plano</Link>
      </header>
      <section aria-label="Planos cadastrados">
        {plans.length === 0 ? (
          <p>Nenhum plano cadastrado.</p>
        ) : (
          <ul>
            {plans.map((item) => (
              <li key={item.plan.id}>
                <Link href={`/admin/plans/${item.plan.id}`}>
                  <strong>{item.draftName ?? item.plan.label}</strong>
                </Link>
                <p>{item.draftFocus ?? 'Sem foco definido'}</p>
                <span>{item.plan.label}</span>
                {item.latestRevisionNumber ? (
                  <span>Rev. {item.latestRevisionNumber}</span>
                ) : (
                  <span>Rascunho</span>
                )}
                {item.archived ? <span>Arquivado</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default async function AdminPlansPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const plans = await listAdminPlans(getDatabase(), { userId: user.id })

  return <PlanListView plans={plans} />
}
