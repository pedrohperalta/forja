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
    expect(markup).toContain('Aguardando publicação')
    expect(markup).toContain('admin-focus-panel')
    expect(markup).toContain('admin-summary-strip')
    expect(markup).toContain('admin-shell')
    expect(markup).toContain('admin-sidebar')
    expect(markup).toContain('admin-nav')
    expect(markup).toContain('admin-display')
    expect(markup).toContain('admin-primary-button')
    expect(markup.indexOf('admin-summary-strip')).toBeLessThan(markup.indexOf('admin-focus-panel'))
    expect(markup).not.toContain('Publicação pendente')
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
            publicationState: 'published',
            plan: { id: 'plan_a', label: 'A' },
          },
        ],
      }),
    )

    expect(markup).toContain('Treinos prontos')
    expect(markup).toContain('0</strong>')
    expect(markup).not.toContain('catálogo')
    expect(markup).not.toContain('Catálogo')
  })

  it('counts unpublished drafts and pending changes as awaiting publication', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminShell, {
        plans: [
          {
            archived: false,
            draftName: 'Treino Novo',
            latestRevisionNumber: null,
            publicationState: 'unpublished-draft',
            plan: { id: 'plan_new', label: 'N' },
          },
          {
            archived: false,
            draftName: 'Treino Editado',
            latestRevisionNumber: 2,
            publicationState: 'pending-changes',
            plan: { id: 'plan_edited', label: 'E' },
          },
          {
            archived: false,
            draftName: 'Treino Sincronizado',
            latestRevisionNumber: 1,
            publicationState: 'published',
            plan: { id: 'plan_synced', label: 'S' },
          },
        ],
      }),
    )

    expect(markup).toContain('Aguardando publicação')
    expect(markup).toContain('2</strong>')
    expect(markup).toContain('Publicar rascunho')
    expect(markup).toContain('/admin/plans/plan_new')
  })

  it('surfaces pending changes on an already published plan', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminShell, {
        plans: [
          {
            archived: false,
            draftName: 'Treino Editado',
            latestRevisionNumber: 2,
            publicationState: 'pending-changes',
            plan: { id: 'plan_edited', label: 'E' },
          },
        ],
      }),
    )

    expect(markup).toContain('Publicar alterações')
    expect(markup).toContain('Treino Editado')
    expect(markup).toContain('1</strong>')
  })
})
