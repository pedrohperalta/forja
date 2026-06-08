import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ImportWorkoutView } from './page'

describe('/admin/import', () => {
  it('renders a structured admin import form instead of raw JSON editing', () => {
    const markup = renderToStaticMarkup(createElement(ImportWorkoutView))

    expect(markup).toContain('Importar treino')
    expect(markup).toContain('Imagem da ficha')
    expect(markup).toContain('Nome da ficha')
    expect(markup).toContain('type="file"')
    expect(markup).not.toContain('<textarea')
  })
})
