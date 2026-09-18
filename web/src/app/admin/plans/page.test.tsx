import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlanListView } from './page'

describe('/admin/plans', () => {
  it('renders the rebranded structured admin plan list', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanListView, {
        plans: [
          {
            plan: { id: 'plan_a', label: 'A' },
            draftName: 'Treino A',
            draftFocus: 'Peito / Ombros',
            draftImportedAt: null,
            latestRevisionNumber: 2,
            publicationState: 'published',
            archived: false,
          },
        ],
      }),
    )

    expect(markup).toContain('GESTÃO DE TREINOS')
    expect(markup).toContain('Treinos')
    expect(markup).toContain('Novo plano')
    expect(markup).toContain('Planos ativos')
    expect(markup).toContain('Treino A')
    expect(markup).toContain('Publicado no app')
    expect(markup).toContain('Editar plano')
    expect(markup).toContain('admin-plan-card')
    expect(markup).toContain('admin-plan-card-actions')
    expect(markup).toContain('status-pill')
    expect(markup).toContain('admin-primary-button')
    expect(markup).not.toContain('Revisão')
    expect(markup).not.toContain('Rev. 2')
    expect(markup).not.toContain('Próxima ação')
    expect(markup).not.toContain('Revisar conteúdo')
    expect(markup).not.toContain('Arquivados</h2>')
  })

  it('makes draft, pending-changes and archived states visually explicit', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanListView, {
        plans: [
          {
            plan: { id: 'plan_draft', label: 'D' },
            draftName: 'Treino Rascunho',
            draftFocus: 'Costas',
            draftImportedAt: null,
            latestRevisionNumber: null,
            publicationState: 'unpublished-draft',
            archived: false,
          },
          {
            plan: { id: 'plan_edited', label: 'P' },
            draftName: 'Treino com Pendências',
            draftFocus: 'Ombros',
            draftImportedAt: null,
            latestRevisionNumber: 3,
            publicationState: 'pending-changes',
            archived: false,
          },
          {
            plan: { id: 'plan_archived', label: 'Z' },
            draftName: 'Treino Antigo',
            draftFocus: 'Arquivo',
            draftImportedAt: null,
            latestRevisionNumber: 3,
            publicationState: 'archived',
            archived: true,
          },
        ],
      }),
    )

    expect(markup).toContain('Rascunho')
    expect(markup).not.toContain('Rascunho não publicado')
    expect(markup).toContain('Publicado com alterações')
    expect(markup).toContain('Revisar e publicar')
    expect(markup.match(/Revisar e publicar/g)).toHaveLength(2)
    expect(markup).toContain('Planos ativos')
    expect(markup).toContain('Arquivados')
    expect(markup).toContain('Arquivado')
    expect(markup).toContain('Não aparece no app')
    expect(markup).toContain('Ver arquivado')
    expect(markup).toContain('Restaurar para editar')
    expect(markup).toContain('Excluir definitivamente')
    expect(markup).toContain('Confirmar exclusão')
    expect(markup).toContain('apaga o plano, rascunhos e revisões')
    expect(markup).toContain('admin-plan-card-archived')
    expect(markup).toContain('admin-permanent-delete')
    expect(markup).not.toContain('Próxima ação')
    expect(markup).not.toContain('Publicar draft')
    expect(markup).not.toContain('Somente leitura')
    expect(markup).not.toContain('>Editar<')
    expect(markup).not.toContain('nasce como draft')
    expect(markup.indexOf('Planos ativos')).toBeLessThan(markup.indexOf('Arquivados'))
  })

  it('renders an actionable empty state', () => {
    const markup = renderToStaticMarkup(createElement(PlanListView, { plans: [] }))

    expect(markup).toContain('Nenhum plano cadastrado')
    expect(markup).toContain('Crie a primeira ficha estruturada')
    expect(markup).toContain('Criar primeiro plano')
    expect(markup).toContain('/admin/plans/new')
    expect(markup.match(/Nenhum plano cadastrado/g)).toHaveLength(1)
  })

  it('flags imported drafts that still need review', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanListView, {
        plans: [
          {
            plan: { id: 'plan_imported', label: 'FICHA' },
            draftName: 'Ficha importada',
            draftFocus: 'Peito',
            draftImportedAt: '2026-09-18T12:00:00.000Z',
            latestRevisionNumber: null,
            publicationState: 'unpublished-draft',
            archived: false,
          },
          {
            plan: { id: 'plan_reviewed', label: 'REV' },
            draftName: 'Ficha revisada',
            draftFocus: 'Costas',
            draftImportedAt: null,
            latestRevisionNumber: 1,
            publicationState: 'published',
            archived: false,
          },
        ],
      }),
    )

    expect(markup.match(/Importado — revise/g)).toHaveLength(1)
    expect(markup.indexOf('Importado — revise')).toBeGreaterThan(-1)
    expect(markup).toContain('Ficha importada')
    expect(markup).toContain('Ficha revisada')
  })

  it('confirms the batch after a photo import', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanListView, { importedCount: 3, plans: [] }),
    )

    expect(markup).toContain('3 fichas criadas como rascunho')
    expect(markup).toContain('Abra cada uma para revisar e publicar')
    expect(markup).toContain('admin-notice-banner')
  })
})
