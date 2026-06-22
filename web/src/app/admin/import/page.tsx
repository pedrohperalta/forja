import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { AdminImportWorkoutForm } from '@/components/admin/AdminImportWorkoutForm'
import { AdminFrame } from '@/components/admin/AdminUi'
import { getCurrentAdminUser } from '@/server/auth/currentAdmin'

type ImportWorkoutViewProps = {
  error?: string | undefined
  notice?: string | undefined
}

type AdminImportPageProps = {
  searchParams: Promise<{
    error?: string
    notice?: string
  }>
}

export function ImportWorkoutView({ error, notice }: ImportWorkoutViewProps = {}): ReactElement {
  return (
    <AdminFrame
      active="import"
      eyebrow="IMPORTAR FICHA"
      title="Importar ficha"
      subtitle="Siga um fluxo simples: envie a imagem, revise a extração e publique quando estiver pronto."
    >
      <AdminImportWorkoutForm error={error} notice={notice} />
    </AdminFrame>
  )
}

export default async function AdminImportPage({
  searchParams,
}: AdminImportPageProps): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { error, notice } = await searchParams

  return <ImportWorkoutView error={error} notice={notice} />
}
