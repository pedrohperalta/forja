import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Plan } from '@forja/domain'

import { PlanEditorView } from './page'

const exercise = {
  id: 'supino-reto',
  name: 'Supino Reto',
  category: 'Peito',
  equipment: 'Barra',
  reps: '10-12',
  sets: 3,
  restSeconds: 60,
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
} satisfies Plan['exercises'][number]

const draftData = {
  id: 'plan_a',
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros',
  exercises: [exercise],
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
} satisfies Plan

const publishedRevisionData = {
  ...draftData,
  focus: 'Peito',
  exercises: [],
} satisfies Plan

function renderPlanEditor(overrides: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(PlanEditorView, {
      plan: {
        plan: { id: 'plan_a', label: 'A' },
        draft: { data: draftData },
        latestRevisionNumber: 1,
        latestRevision: { revisionNumber: 1, data: publishedRevisionData },
        archived: false,
        tombstone: null,
        ...overrides,
      },
    }),
  )
}

describe('/admin/plans/[planId]', () => {
  it('renders structured draft editing with a fixed action bar inside the form', () => {
    const markup = renderPlanEditor()

    expect(markup).toContain('Treino A')
    expect(markup).toContain('Supino Reto')
    expect(markup).toContain('Publicado com alterações')
    expect(markup).toContain('Rev. 1')
    expect(markup).toContain('admin-title-input')
    expect(markup).toContain('name="name"')
    expect(markup.match(/name="name"/g)).toHaveLength(1)
    expect(markup).toContain('form="plan-draft-plan_a"')
    expect(markup).toContain('Arquivar')
    expect(markup).toContain('Excluir definitivamente')
    expect(markup).toContain('Confirmar exclusão')
    expect(markup).toContain('apaga o plano, rascunhos e revisões')
    expect(markup).toContain('Zona de risco')
    expect(markup).toContain('admin-exercise-editor')
    expect(markup).toContain('admin-exercise-summary-actions')
    expect(markup).toContain('admin-exercise-toggle')
    expect(markup).toContain('admin-plan-draft-form')
    expect(markup).toContain('admin-drag-icon-button')
    expect(markup).toContain('admin-drag-icon')
    expect(markup).toContain('Arraste para reordenar')
    expect(markup).toContain('Foto do aparelho')
    expect(markup).toContain('name="exercisePhoto:supino-reto"')
    expect(markup).toContain('accept="image/jpeg"')
    expect(markup).toContain('admin-equipment-photo-input')
    expect(markup).toContain('admin-exercise-advanced')
    expect(markup).toContain('Ajustes avançados')
    expect(markup).toContain('admin-danger-actions')
    expect(markup).toContain('admin-delete-confirmation')

    expect(markup).toContain('admin-editor-actionbar')
    expect(markup.indexOf('admin-plan-draft-form')).toBeLessThan(
      markup.indexOf('admin-editor-actionbar'),
    )
    expect(markup).toContain('Salvar')
    expect(markup).toContain('Publicar revisão')
    expect(markup).not.toContain('Salvar rascunho')
    expect(markup).not.toContain('admin-editor-next-step')
    expect(markup).not.toContain('Próxima ação')
  })

  it('offers manual exercise creation and two-step removal', () => {
    const markup = renderPlanEditor()

    expect(markup).toContain('Adicionar exercício')
    expect(markup).toContain('admin-add-exercise')
    expect(markup).toContain('name="exerciseName"')
    expect(markup).toContain('name="exerciseCategory"')
    expect(markup).toContain('Remover exercício')
    expect(markup).toContain('admin-exercise-remove')
    expect(markup).toContain('Confirmar remoção')
  })

  it('shows the just-added exercise expanded and focused', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_a', label: 'A' },
          draft: { data: draftData },
          latestRevisionNumber: 1,
          latestRevision: { revisionNumber: 1, data: publishedRevisionData },
          archived: false,
          tombstone: null,
        },
        addedExerciseId: 'supino-reto',
      }),
    )

    expect(markup).toContain('open=""')
    expect(markup).toContain('autofocus')
  })

  it('teaches the next step when the plan has no exercises yet', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_empty', label: 'V' },
          draft: {
            data: {
              id: 'plan_empty',
              label: 'V',
              name: 'Treino Vazio',
              focus: 'A definir',
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

    expect(markup).toContain('Nenhum exercício ainda')
    expect(markup).toContain('Adicionar exercício')
    expect(markup).toContain('padrões prontos')
  })

  it('highlights imported exercises that need review', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_imported', label: 'FICHA' },
          draft: {
            data: {
              id: 'plan_imported',
              label: 'FICHA',
              name: 'Ficha importada',
              focus: 'Peito',
              exercises: [
                { ...exercise, id: 'flagged', needsReview: true },
                { ...exercise, id: 'trusted' },
              ],
              importedAt: '2026-05-18T12:00:00.000Z',
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

    expect(markup).toContain('Extraído da foto')
    expect(markup).toContain('Confira os campos destacados')
    expect(markup).toContain('admin-exercise-card-needs-review')
    expect(markup).toContain('data-tone="warning">Revisar')
    expect(markup).not.toContain('% confiança')
  })

  it('confirms publication with the revision number', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_a', label: 'A' },
          draft: { data: draftData },
          latestRevisionNumber: 2,
          latestRevision: { revisionNumber: 2, data: draftData },
          archived: false,
          tombstone: null,
        },
        publishedRevision: 2,
      }),
    )

    expect(markup).toContain('admin-notice-banner')
    expect(markup).toContain('Rev. 2 publicada')
    expect(markup).toContain('puxe para atualizar')
  })

  it('shows archived plans as locked with restore in the action bar', () => {
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
    expect(markup).toContain('Não aparece no app')
    expect(markup).toContain('Restaurar para editar')
    expect(markup).toContain('Excluir definitivamente')
    expect(markup).toContain('Confirmar exclusão')
    expect(markup).toContain('disabled=""')
    expect(markup.indexOf('admin-editor-actionbar')).toBeGreaterThan(-1)
    expect(markup.indexOf('Restaurar para editar')).toBeGreaterThan(
      markup.indexOf('admin-editor-actionbar'),
    )
    expect(markup).not.toContain('>Salvar<')
    expect(markup).not.toContain('Adicionar exercício')
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
              name: 'Treino Rascunho',
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
    expect(markup).toContain('Rascunho')
    expect(markup).not.toContain('Rascunho não publicado')
    expect(markup).not.toContain('Alterações em rascunho')
  })

  it('shows published plans as synced when the draft matches the latest revision', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanEditorView, {
        plan: {
          plan: { id: 'plan_published', label: 'P' },
          draft: {
            data: {
              id: 'plan_published',
              label: 'P',
              name: 'Treino Publicado',
              focus: 'Pernas',
              exercises: [],
              createdAt: '2026-05-18T12:00:00.000Z',
              updatedAt: '2026-05-18T12:00:00.000Z',
            },
          },
          latestRevisionNumber: 2,
          latestRevision: {
            revisionNumber: 2,
            data: {
              id: 'plan_published',
              label: 'P',
              name: 'Treino Publicado',
              focus: 'Pernas',
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

    expect(markup).toContain('Publicado no app')
    expect(markup).toContain('Esta versão já está publicada no app')
    expect(markup).toContain('disabled=""')
    expect(markup).not.toContain('Publicar revisão')
    expect(markup).not.toContain('Publique para aparecer no app')
  })
})
