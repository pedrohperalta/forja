import type { Plan } from '@forja/domain'
import { notFound, redirect } from 'next/navigation'
import type { ReactElement } from 'react'
import Link from 'next/link'

import { AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { getDatabase } from '@/server/db/client'
import { getPublicationState, getPublicationStatus } from '@/lib/publicationState'
import { getAdminPlan } from '@/server/services/plans/planService'

type PlanPreviewViewProps = {
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
  }
}

type PlanPreviewPageProps = {
  params: Promise<{
    planId: string
  }>
}

export function PlanPreviewView({ plan }: PlanPreviewViewProps): ReactElement {
  const draft = plan.draft

  if (!draft) {
    return (
      <AdminFrame
        active="plans"
        eyebrow="PRÉVIA DO PLANO"
        title="Prévia indisponível"
        subtitle="Este plano não tem rascunho para pré-visualizar."
      >
        <Link className="admin-secondary-button" href="/admin/plans">
          Voltar aos planos
        </Link>
      </AdminFrame>
    )
  }

  const publicationState = getPublicationState({
    archived: plan.archived,
    draftData: draft.data,
    latestRevisionData: null,
  })
  const status = getPublicationStatus(publicationState)

  return (
    <AdminFrame
      active="plans"
      eyebrow="PRÉVIA DO PLANO"
      title={draft.data.name}
      subtitle="Como o app mostra este plano."
      action={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
    >
      <div className="admin-preview-stage">
        <div className="admin-preview-phone">
          <div className="admin-preview-screen">
            <span className="admin-preview-chip">{draft.data.label}</span>
            <h2 className="admin-preview-name admin-display">{draft.data.name}</h2>
            <p className="admin-preview-focus">{draft.data.focus}</p>
            {draft.data.exercises.length === 0 ? (
              <p className="admin-preview-empty">Nenhum exercício ainda.</p>
            ) : (
              <ol className="admin-preview-list">
                {draft.data.exercises.map((exercise, index) => (
                  <li className="admin-preview-exercise" key={exercise.id}>
                    <span className="admin-preview-index admin-display">{index + 1}</span>
                    <span className="admin-preview-copy">
                      <strong>{exercise.name}</strong>
                      <small>
                        {exercise.category} · {exercise.equipment}
                      </small>
                    </span>
                    <span className="admin-preview-numbers">
                      <span className="admin-display">
                        {exercise.sets}×{exercise.reps}
                      </span>
                      <small>{exercise.restSeconds}s descanso</small>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      <div className="admin-preview-actions">
        <Link className="admin-secondary-button" href={`/admin/plans/${plan.plan.id}`}>
          Voltar ao editor
        </Link>
      </div>
    </AdminFrame>
  )
}

export default async function PlanPreviewPage({ params }: PlanPreviewPageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { planId } = await params
  const plan = await getAdminPlan(getDatabase(), { userId: user.id, planId })

  if (!plan) {
    notFound()
  }

  return (
    <PlanPreviewView
      plan={{
        plan: plan.plan,
        draft: plan.draft,
        latestRevisionNumber: plan.latestRevisionNumber,
        latestRevision: plan.latestRevision,
        archived: plan.archived,
      }}
    />
  )
}
