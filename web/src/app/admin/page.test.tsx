import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AdminShell } from './page'

describe('/admin', () => {
  it('renders a protected-shell placeholder', () => {
    const markup = renderToStaticMarkup(createElement(AdminShell))

    expect(markup).toContain('Forja Admin')
    expect(markup).toContain('Protected shell')
  })
})
