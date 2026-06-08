import { createElement, type ReactElement } from 'react'
import { redirect } from 'next/navigation'

import { getCurrentAdminUser } from '@/server/auth/currentAdmin'

export function AdminShell(): ReactElement {
  return createElement(
    'main',
    null,
    createElement('h1', null, 'Forja Admin'),
    createElement('p', null, 'Protected shell'),
  )
}

export default async function AdminPage(): Promise<ReactElement> {
  const user = await getCurrentAdminUser()

  if (!user) {
    redirect('/admin/login')
  }

  return createElement(AdminShell)
}
