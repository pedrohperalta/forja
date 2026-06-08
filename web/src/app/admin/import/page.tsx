import { redirect } from 'next/navigation'
import type { ReactElement } from 'react'

import { getCurrentAdminUser } from '@/server/auth/currentAdmin'

export function ImportWorkoutView(): ReactElement {
  return (
    <main>
      <nav>
        <a href="/admin">Admin</a>
      </nav>
      <header>
        <h1>Importar treino</h1>
      </header>
      <form
        action="/api/admin/import/extract-workout"
        encType="multipart/form-data"
        method="post"
      >
        <label htmlFor="label">Nome da ficha</label>
        <input id="label" name="label" required type="text" />
        <label htmlFor="image">Imagem da ficha</label>
        <input accept="image/jpeg" id="image" name="image" required type="file" />
        <button type="submit">Extrair treino</button>
      </form>
    </main>
  )
}

export default async function AdminImportPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  return <ImportWorkoutView />
}
