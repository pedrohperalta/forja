import { createElement, type ReactElement } from 'react'

export default function AdminLoginPage(): ReactElement {
  return createElement(
    'main',
    null,
    createElement('h1', null, 'Forja Admin'),
    createElement('a', { href: '/api/admin/auth/google/start' }, 'Entrar'),
  )
}
