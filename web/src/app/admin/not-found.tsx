import type { ReactElement } from 'react'
import Link from 'next/link'

import { AdminCard } from '@/components/admin/AdminUi'

export function AdminNotFoundView(): ReactElement {
  return (
    <section aria-label="Página não encontrada" className="admin-section">
      <AdminCard className="admin-empty-state">
        <p className="admin-section-title">Não encontramos esta página</p>
        <p className="admin-muted">O endereço não existe ou o item foi excluído.</p>
        <Link className="admin-primary-button" href="/admin">
          Voltar ao painel
        </Link>
      </AdminCard>
    </section>
  )
}

export default function AdminNotFound(): ReactElement {
  return <AdminNotFoundView />
}
