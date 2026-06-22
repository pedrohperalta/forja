import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ImportWorkoutView } from './page'

describe('/admin/import', () => {
  it('renders a rebranded structured admin import form instead of raw JSON editing', () => {
    const markup = renderToStaticMarkup(createElement(ImportWorkoutView))

    expect(markup).toContain('IMPORTAR FICHA')
    expect(markup).toContain('Enviar imagens')
    expect(markup).toContain('Revisar extração')
    expect(markup).toContain('Publicar no app')
    expect(markup).toContain('Imagens da ficha')
    expect(markup).toContain('Nome da ficha')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('admin-linear-flow')
    expect(markup).toContain('admin-stepper')
    expect(markup).toContain('admin-file-upload')
    expect(markup).toContain('Selecionar imagens')
    expect(markup).toContain('JPG, PNG, WebP ou HEIC')
    expect(markup).toContain('Otimizamos imagens grandes antes do envio')
    expect(markup).toContain('Nenhuma imagem selecionada')
    expect(markup).toContain('admin-card')
    expect(markup).toContain('admin-input')
    expect(markup).toContain('admin-primary-button')
    expect(markup).toContain('Continuar para extração')
    expect(markup).toContain('Extraindo com IA')
    expect(markup).not.toContain('action="/api/admin/import/extract-workout"')
    expect(markup).not.toContain('admin-form-grid')
    expect(markup).not.toContain('<textarea')
  })

  it('renders a friendly import error message', () => {
    const markup = renderToStaticMarkup(<ImportWorkoutView error="upload_too_large" />)

    expect(markup).toContain('Imagem muito grande')
    expect(markup).toContain('Tentamos otimizar a imagem, mas ela ainda passou de 5 MB')
    expect(markup).toContain('admin-error-banner')
  })

  it('renders a friendly notice when an old browser submission is redirected back', () => {
    const markup = renderToStaticMarkup(<ImportWorkoutView notice="extraction_finished" />)

    expect(markup).toContain('Extração concluída')
    expect(markup).toContain('evitar mostrar JSON cru')
    expect(markup).toContain('admin-notice-banner')
  })
})
