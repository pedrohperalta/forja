import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { Plan } from '@forja/domain'

import { PlanPreviewView } from './page'

const draftData = {
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
} satisfies Plan

describe('/admin/plans/[planId]/preview', () => {
  it('renders the draft the way the mobile app presents it', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanPreviewView, {
        plan: {
          plan: { id: 'plan_a', label: 'A' },
          draft: { data: draftData },
          latestRevisionNumber: 1,
          latestRevision: null,
          archived: false,
        },
      }),
    )

    expect(markup).toContain('PRÉVIA DO PLANO')
    expect(markup).toContain('Como o app mostra este plano')
    expect(markup).toContain('admin-preview-phone')
    expect(markup).toContain('admin-preview-screen')
    expect(markup).toContain('Treino A')
    expect(markup).toContain('Peito / Ombros')
    expect(markup).toContain('Supino Reto')
    expect(markup).toContain('3×10-12')
    expect(markup).toContain('60s descanso')
    expect(markup).toContain('Voltar ao editor')
    expect(markup).toContain('href="/admin/plans/plan_a"')
    expect(markup).not.toContain('admin-editor-actionbar')
    expect(markup).not.toContain('<input')
  })

  it('teaches the next step when there is nothing to preview yet', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanPreviewView, {
        plan: {
          plan: { id: 'plan_empty', label: 'V' },
          draft: {
            data: {
              ...draftData,
              id: 'plan_empty',
              label: 'V',
              name: 'Treino Vazio',
              focus: 'A definir',
              exercises: [],
            },
          },
          latestRevisionNumber: null,
          latestRevision: null,
          archived: false,
        },
      }),
    )

    expect(markup).toContain('Nenhum exercício ainda')
    expect(markup).toContain('admin-preview-phone')
  })

  it('handles plans without a draft', () => {
    const markup = renderToStaticMarkup(
      createElement(PlanPreviewView, {
        plan: {
          plan: { id: 'plan_z', label: 'Z' },
          draft: null,
          latestRevisionNumber: null,
          latestRevision: null,
          archived: true,
        },
      }),
    )

    expect(markup).toContain('Prévia indisponível')
    expect(markup).toContain('Voltar aos planos')
  })
})
