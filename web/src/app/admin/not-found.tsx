import type { ReactElement } from 'react'
import Link from 'next/link'

export function AdminNotFoundView(): ReactElement {
  return (
    <section aria-label="Página não encontrada" className="admin-section">
      <div className="admin-error-banner" role="alert">
        <strong>Não encontramos esta página</strong>
        <p>O endereço não existe ou o item foi excluído.</p>
      </div>
      <div className="admin-actions-row admin-actions-row-tight">
        <Link className="admin-primary-button" href="/admin">
          Voltar ao painel
        </Link>
      </div>
    </section>
  )
}

export default function AdminNotFound(): ReactElement {
  return <AdminNotFoundView />
}
