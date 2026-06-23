import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AdminLoginPage from './page'

describe('/admin/login', () => {
  it('renders a branded admin login entry point', () => {
    const markup = renderToStaticMarkup(<AdminLoginPage />)

    expect(markup).toContain('FORJA ADMIN')
    expect(markup).toContain('Entrar com Google')
    expect(markup).toContain('/api/admin/auth/google/start')
    expect(markup).toContain('admin-login-page')
    expect(markup).toContain('admin-primary-button')
    // login assurance chips removed as unnecessary noise
    expect(markup).not.toContain('admin-login-assurance')
    expect(markup).not.toContain('Acesso restrito')
    expect(markup).not.toContain('Publicação sempre manual')
    expect(markup).toContain('bg-accent')
  })
})
