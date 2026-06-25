import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlanEditorView } from './page'

describe('/admin/plans/[planId]', () => {
  it('renders rebranded structured draft editing controls', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_a', label: 'A' },
          draft: {
            data: {
              id: 'plan_a',
              label: 'A',
              name: 'Treino A',
              focus: 'Peito / Ombros',
              exercises: [
                {
                  id: 'supino-reto',
                  name: 'Supino Reto',
                  category: 'Peito',
                  equipment: 'Barra',
                  reps: '10-12',
                  sets: 3,
                  restSeconds: 60,
                  createdAt: '2026-05-18T12:00:00.000Z',
                  updatedAt: '2026-05-18T12:00:00.000Z',
                },
              ],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          latestRevisionNumber: 1,
          latestRevision: {
            revisionNumber: 1,
            data: {
              id: 'plan_a',
              label: 'A',
              name: 'Treino A',
              focus: 'Peito',
              exercises: [],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          archived: false,
          tombstone: null,
        },
      }),
    )

    expect(markup).toContain('Treino A')
    expect(markup).toContain('Supino Reto')
    expect(markup).toContain('Publicar revisão')
    expect(markup).toContain('Alterações em rascunho')
    expect(markup).toContain('Próxima ação')
    expect(markup).toContain('Publique a revisão para atualizar o app')
    expect(markup).toContain('Arquivar')
    expect(markup).toContain('Excluir definitivamente')
    expect(markup).toContain('Confirmar exclusão')
    expect(markup).toContain('apaga o plano, rascunhos e revisões')
    expect(markup).toContain('Zona de risco')
    expect(markup).toContain('admin-editor-next-step')
    expect(markup).toContain('admin-exercise-editor')
    expect(markup).toContain('admin-exercise-summary-actions')
    expect(markup).toContain('admin-exercise-toggle')
    expect(markup).toContain('admin-plan-draft-form')
    expect(markup).toContain('Salvar rascunho')
    expect(markup).toContain('admin-drag-icon-button')
    expect(markup).toContain('admin-drag-icon')
    expect(markup).toContain('Arraste para reordenar')
    expect(markup).not.toContain('admin-drag-handle')
    expect(markup).not.toContain('>Arrastar</button>')
    expect(markup).toContain('Foto do aparelho')
    expect(markup).toContain('name="exercisePhoto:supino-reto"')
    expect(markup).toContain('accept="image/jpeg"')
    expect(markup).toContain('admin-equipment-photo-input')
    expect(markup).toContain('admin-exercise-advanced')
    expect(markup).toContain('admin-danger-actions')
    expect(markup).toContain('admin-delete-confirmation')
    expect(markup).toContain('Ajustes avançados')
    expect(markup).not.toContain('Salvar exercício')
    expect(markup).not.toContain('Subir')
    expect(markup).not.toContain('Descer')
    expect(markup).not.toContain('admin-reorder-controls')
    expect(markup).not.toContain('Mover para cima')
    expect(markup).not.toContain('Mover para baixo')
    expect(markup).toContain('admin-primary-button')
    expect(markup).toContain('admin-exercise-card')
    expect(markup).not.toContain('admin-sticky-publish')
    expect(markup).not.toContain('admin-publication-banner')
    expect(markup).not.toContain('admin-stats-grid')
    expect(markup).not.toContain('<textarea')
  })

  it('shows archived plans as locked and absent from the app', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_z', label: 'Z' },
          draft: {
            data: {
              id: 'plan_z',
              label: 'Z',
              name: 'Treino Arquivado',
              focus: 'Antigo',
              exercises: [],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          latestRevisionNumber: 4,
          latestRevision: {
            revisionNumber: 4,
            data: {
              id: 'plan_z',
              label: 'Z',
              name: 'Treino Arquivado',
              focus: 'Antigo',
              exercises: [],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          archived: true,
          tombstone: {
            deletedAt: new Date('2026-05-19T12:00:00.000Z'),
          },
        },
      }),
    )

    expect(markup).toContain('Arquivado')
    expect(markup).toContain('Plano arquivado')
    expect(markup).toContain('Não aparece no app')
    expect(markup).toContain('Restaurar para editar')
    expect(markup).toContain('Excluir definitivamente')
    expect(markup).toContain('Confirmar exclusão')
    expect(markup).toContain('disabled=""')
  })

  it('labels first publication clearly', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_draft', label: 'D' },
          draft: {
            data: {
              id: 'plan_draft',
              label: 'D',
              name: 'Treino Draft',
              focus: 'Costas',
              exercises: [],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          latestRevisionNumber: null,
          latestRevision: null,
          archived: false,
          tombstone: null,
        },
      }),
    )

    expect(markup).toContain('Publicar no app')
    expect(markup).toContain('Ainda não aparece no app')
  })

  it('shows published plans as synced when the draft matches the latest revision', () => {
    const publishedPlan = {
      id: 'plan_published',
      label: 'P',
      name: 'Treino Publicado',
      focus: 'Pernas',
      exercises: [],
      createdAt: '2026-05-18T12:00:00.000Z',
      updatedAt: '2026-05-18T12:00:00.000Z',
    }

    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_published', label: 'P' },
          draft: {
            data: publishedPlan,
          },
          latestRevisionNumber: 2,
          latestRevision: {
            revisionNumber: 2,
            data: publishedPlan,
          },
          archived: false,
          tombstone: null,
        },
      }),
    )

    expect(markup).toContain('Publicado no app')
    expect(markup).toContain('Esta versão já está publicada no app')
    expect(markup).toContain('Publicado')
    expect(markup).toContain('disabled=""')
    expect(markup).not.toContain('Publicar revisão')
    expect(markup).not.toContain('Publique para aparecer no app')
  })
})
