import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AdminShell } from './page'

describe('/admin', () => {
  it('renders the rebranded operational admin shell', () => {
    const markup = renderToStaticMarkup(createElement(AdminShell))

    expect(markup).toContain('FORJA ADMIN')
    expect(markup).toContain('Visão geral')
    expect(markup).toContain('Planos de treino')
    expect(markup).toContain('Começar treinos')
    expect(markup).toContain('Importar ficha')
    expect(markup).toContain('Próxima ação')
    expect(markup).toContain('Publicação pendente')
    expect(markup).toContain('admin-focus-panel')
    expect(markup).toContain('admin-summary-strip')
    expect(markup).toContain('admin-shell')
    expect(markup).toContain('admin-sidebar')
    expect(markup).toContain('admin-nav')
    expect(markup).toContain('admin-display')
    expect(markup).toContain('admin-primary-button')
    expect(markup.indexOf('admin-summary-strip')).toBeLessThan(markup.indexOf('admin-focus-panel'))
    expect(markup).not.toContain('catálogo')
    expect(markup).not.toContain('Catálogo')
    expect(markup).not.toContain('admin-simple-actions')
    expect(markup).not.toContain('admin-data-table')
    expect(markup).not.toContain('Fluxo de publicação')
    expect(markup).not.toContain('Saúde do app')
    expect(markup).not.toContain('Últimas atividades')
  })

  it('uses an in-good-shape title when there are published plans and no drafts', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminShell, {
        plans: [
          {
            archived: false,
            draftName: 'Treino A',
            latestRevisionNumber: 1,
            plan: { id: 'plan_a', label: 'A' },
          },
        ],
      }),
    )

    expect(markup).toContain('Treinos prontos')
    expect(markup).not.toContain('catálogo')
    expect(markup).not.toContain('Catálogo')
  })
})
