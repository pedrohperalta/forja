import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AdminTag, StatusPill } from './AdminUi'

describe('AdminTag', () => {
  it('renders a non-interactive metadata tag, not a pill/button', () => {
    const markup = renderToStaticMarkup(createElement(AdminTag, { children: '12 exercícios' }))

    expect(markup).toContain('admin-tag')
    expect(markup).toContain('12 exercícios')
    expect(markup).not.toContain('status-pill')
    expect(markup).not.toContain('admin-primary-button')
    expect(markup).not.toContain('href')
    expect(markup).not.toContain('role="button"')
  })
})

describe('StatusPill', () => {
  it('still renders semantic status pills with a tone', () => {
    const markup = renderToStaticMarkup(
      createElement(StatusPill, { tone: 'accent', children: 'Publicado' }),
    )

    expect(markup).toContain('status-pill')
    expect(markup).toContain('data-tone="accent"')
  })
})
