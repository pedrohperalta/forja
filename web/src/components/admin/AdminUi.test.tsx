import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AdminFrame, AdminTag, StatusPill } from './AdminUi'

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

describe('AdminFrame shell', () => {
  it('renders a sidebar nav with all destinations and marks the active one', () => {
    const markup = renderToStaticMarkup(
      createElement(AdminFrame, {
        active: 'plans',
        eyebrow: 'GESTÃO',
        title: 'Treinos',
        children: createElement('p', null, 'conteúdo'),
      }),
    )

    expect(markup).toContain('admin-sidebar')
    expect(markup).toContain('admin-nav')
    expect(markup).toContain('href="/admin"')
    expect(markup).toContain('href="/admin/plans"')
    expect(markup).toContain('href="/admin/import"')
    expect(markup).toContain('href="/admin/mobile-builds"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).toContain('data-active="true"')
    expect(markup).toContain('Sair')
    expect(markup).toContain('conteúdo')
  })
})
