'use client'

import type { ReactElement } from 'react'
import Link from 'next/link'

export function AdminErrorView({
  onRetry,
}: {
  onRetry: () => void
}): ReactElement {
  return (
    <section aria-label="Erro inesperado" className="admin-section">
      <div className="admin-error-banner" role="alert">
        <strong>Algo saiu do trilho</strong>
        <p>
          Não foi possível carregar esta parte do admin. O resto do painel continua de pé — tente
          de novo ou volte para os planos.
        </p>
      </div>
      <div className="admin-actions-row admin-actions-row-tight">
        <button className="admin-primary-button" onClick={onRetry} type="button">
          Tentar de novo
        </button>
        <Link className="admin-secondary-button" href="/admin/plans">
          Ir para planos
        </Link>
      </div>
    </section>
  )
}

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): ReactElement {
  void error

  return <AdminErrorView onRetry={reset} />
}
