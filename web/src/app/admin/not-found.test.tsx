import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AdminNotFound, { AdminNotFoundView } from './not-found'

describe('admin not-found boundary', () => {
  it('explains the miss calmly and routes back to the dashboard', () => {
    const markup = renderToStaticMarkup(createElement(AdminNotFoundView))

    expect(markup).toContain('Não encontramos esta página')
    expect(markup).toContain('O endereço não existe ou o item foi excluído.')
    expect(markup).toContain('href="/admin"')
    expect(markup).toContain('Voltar ao painel')
    expect(markup).toContain('admin-empty-state')
    expect(markup).not.toContain('admin-error-banner')
    expect(markup).not.toContain('role="alert"')
  })

  it('exposes a default export for the App Router', () => {
    expect(typeof AdminNotFound).toBe('function')
  })
})
