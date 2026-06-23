import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminCard, AdminFrame, StatusPill } from '@/components/admin/AdminUi'
import { AdminBuildAutoRefresh } from '@/components/admin/AdminBuildAutoRefresh'
import { AdminBuildLog } from '@/components/admin/AdminBuildLog'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'
import { listMobileBuildJobs, readMobileBuildLog, type MobileBuildJob } from '@/server/mobileBuilds'

type PageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AdminMobileBuildsPage({
  searchParams,
}: PageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()
  if (!user) {
    redirect('/admin/login')
  }

  const { error } = await searchParams
  const builds = await listMobileBuildJobs()
  const runningBuild = builds.find((build) => build.status === 'running')
  const latestBuild = builds[0]
  const latestLog = latestBuild ? await readMobileBuildLog(latestBuild.id) : ''
  const completedCount = builds.filter((build) => build.status === 'completed').length
  const failedCount = builds.filter((build) => build.status === 'failed').length

  return (
    <AdminFrame
      active="builds"
      eyebrow="MOBILE"
      title="Builds do app"
      subtitle="Gere APKs internos ou AABs de release apontando para a API em produção."
    >
      <section className="admin-build-page">
        <AdminCard accent className="admin-linear-panel">
          {error ? (
            <div className="admin-error-banner" role="alert">
              <strong>Não foi possível iniciar a build</strong>
              <p>{error}</p>
            </div>
          ) : null}

          <div className="admin-build-command">
            <div>
              <p className="admin-section-label">Pipeline Android</p>
              <h2 className="admin-panel-title admin-display">Gerar artefato</h2>
              <p className="admin-muted">
                APK para instalação direta no aparelho. AAB para distribuição pela Play Store.
              </p>
            </div>
            <div className="admin-build-actions">
              <BuildForm disabled={Boolean(runningBuild)} label="Gerar APK" type="apk" />
              <BuildForm disabled={Boolean(runningBuild)} label="Gerar AAB" type="aab" />
            </div>
          </div>

          <div className="admin-build-summary" aria-label="Resumo das builds">
            <SummaryMetric label="Total" value={String(builds.length)} />
            <SummaryMetric label="Prontas" value={String(completedCount)} />
            <SummaryMetric label="Falhas" value={String(failedCount)} />
          </div>

          <AdminBuildAutoRefresh enabled={Boolean(runningBuild)} />
        </AdminCard>

        <AdminCard className="admin-linear-panel">
          <div className="admin-build-header">
            <div>
              <p className="admin-section-label">Histórico</p>
              <h2 className="admin-panel-title admin-display">Artefatos</h2>
            </div>
            {runningBuild ? <StatusPill tone="warning">Build em andamento</StatusPill> : null}
          </div>

          {builds.length > 0 ? (
            <div className="admin-build-list">
              {builds.map((build) => (
                <BuildRow build={build} key={build.id} />
              ))}
            </div>
          ) : (
            <p className="admin-muted">Nenhuma build foi criada ainda.</p>
          )}
        </AdminCard>

        {latestBuild ? (
          <AdminCard className="admin-linear-panel admin-log-panel">
            <div className="admin-log-toolbar">
              <div>
                <p className="admin-section-label">Log recente</p>
                <h2 className="admin-panel-title admin-display">{latestBuild.id}</h2>
              </div>
              <div className="admin-log-toolbar-meta">
                <span>últimas 80 linhas</span>
                <StatusPill tone={getStatusTone(latestBuild.status)}>
                  {getStatusLabel(latestBuild.status)}
                </StatusPill>
              </div>
            </div>
            <AdminBuildLog log={tailLog(latestLog)} />
          </AdminCard>
        ) : null}
      </section>
    </AdminFrame>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="admin-build-metric">
      <span>{label}</span>
      <strong className="admin-display">{value}</strong>
    </div>
  )
}

function BuildForm({
  disabled,
  label,
  type,
}: {
  disabled: boolean
  label: string
  type: 'apk' | 'aab'
}): ReactElement {
  return (
    <form action="/api/admin/mobile-builds" method="post">
      <input name="type" type="hidden" value={type} />
      <button className="admin-primary-button bg-accent" disabled={disabled} type="submit">
        {label}
      </button>
    </form>
  )
}

function BuildRow({ build }: { build: MobileBuildJob }): ReactElement {
  return (
    <article className="admin-build-row" data-status={build.status}>
      <div className="admin-build-status-rail" aria-hidden="true" />
      <div className="admin-build-row-main">
        <div className="admin-build-row-title">
          <div>
            <span className="admin-build-type">{build.type.toUpperCase()}</span>
            <strong>{build.artifactName ?? build.id}</strong>
          </div>
          {build.status === 'completed' ? null : (
            <StatusPill tone={getStatusTone(build.status)}>
              {getStatusLabel(build.status)}
            </StatusPill>
          )}
        </div>
        <div className="admin-build-meta">
          <span>#{build.id}</span>
          <span>Criada {formatDate(build.createdAt)}</span>
          {build.completedAt ? <span>Finalizada {formatDate(build.completedAt)}</span> : null}
          {build.artifactBytes ? <span>{formatBytes(build.artifactBytes)}</span> : null}
        </div>
      </div>

      {build.status === 'completed' && build.artifactName ? (
        <a
          className="admin-secondary-button"
          href={`/api/admin/mobile-builds/${build.id}/download/${encodeURIComponent(
            build.artifactName,
          )}`}
        >
          Baixar
        </a>
      ) : null}
    </article>
  )
}

function getStatusTone(status: MobileBuildJob['status']): 'accent' | 'warning' | 'danger' {
  if (status === 'completed') {
    return 'accent'
  }

  return status === 'running' ? 'warning' : 'danger'
}

function getStatusLabel(status: MobileBuildJob['status']): string {
  if (status === 'completed') {
    return 'Pronta'
  }

  return status === 'running' ? 'Rodando' : 'Falhou'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function tailLog(log: string): string {
  return log.split('\n').slice(-80).join('\n').trim()
}
