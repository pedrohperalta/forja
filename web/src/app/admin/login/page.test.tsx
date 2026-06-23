import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AdminLoginPage from './page'

describe('/admin/login', () => {
  it('renders a branded admin login entry point', () => {
    const markup = renderToStaticMarkup(<AdminLoginPage />)

    expect(markup).toContain('FORJA ADMIN')
    expect(markup).toContain('Entrar com Google')
    expect(markup).toContain('Acesso restrito')
    expect(markup).toContain('Publicação sempre manual')
    expect(markup).toContain('/api/admin/auth/google/start')
    expect(markup).toContain('admin-login-page')
    expect(markup).toContain('admin-login-assurance')
    // assurances are static metadata, not buttons — rendered as AdminTag
    expect(markup).toContain('admin-tag')
    expect(markup).toContain('admin-primary-button')
    expect(markup).toContain('bg-accent')
  })
})
