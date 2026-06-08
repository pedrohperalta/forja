import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NewPlanView } from './page'

describe('/admin/plans/new', () => {
  it('renders structured fields instead of raw JSON editing', () => {
    const markup = renderToStaticMarkup(createElement(NewPlanView))

    expect(markup).toContain('Novo plano')
    expect(markup).toContain('Nome')
    expect(markup).toContain('Foco')
    expect(markup).toContain('Exercício inicial')
    expect(markup).not.toContain('<textarea')
  })
})
