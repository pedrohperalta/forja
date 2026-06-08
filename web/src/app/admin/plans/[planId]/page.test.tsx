import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlanEditorView } from './page'

describe('/admin/plans/[planId]', () => {
  it('renders structured draft editing controls', () => {
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
          archived: false,
          tombstone: null,
        },
      }),
    )

    expect(markup).toContain('Treino A')
    expect(markup).toContain('Supino Reto')
    expect(markup).toContain('Publicar')
    expect(markup).toContain('Arquivar')
    expect(markup).not.toContain('<textarea')
  })
})
