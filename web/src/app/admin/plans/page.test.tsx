import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PlanListView } from './page'

describe('/admin/plans', () => {
  it('renders the structured admin plan list', () => {
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

    expect(markup).toContain('Planos')
    expect(markup).toContain('Novo plano')
    expect(markup).toContain('Treino A')
    expect(markup).toContain('Rev. 2')
  })
})
