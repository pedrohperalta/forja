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
            latestRevisionNumber: 2,
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

  it('makes draft and archived states visually explicit', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanListView, {
        plans: [
          {
            plan: { id: 'plan_draft', label: 'D' },
            draftName: 'Treino Draft',
            draftFocus: 'Costas',
            latestRevisionNumber: null,
            archived: false,
          },
          {
            plan: { id: 'plan_archived', label: 'Z' },
            draftName: 'Treino Antigo',
            draftFocus: 'Arquivo',
            latestRevisionNumber: 3,
            archived: true,
          },
        ],
      }),
    )

    expect(markup).toContain('Rascunho não publicado')
    expect(markup).toContain('Planos ativos')
    expect(markup).toContain('Revisar e publicar')
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
})
