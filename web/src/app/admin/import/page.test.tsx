import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ImportWorkoutView } from './page'

describe('/admin/import', () => {
  it('declares the one-photo-one-ficha rule and skips the read-only review step', () => {
    const markup = renderToStaticMarkup(createElement(ImportWorkoutView))

    expect(markup).toContain('IMPORTAR FICHA')
    expect(markup).toContain('Foto vira ficha')
    expect(markup).toContain('Cada foto vira uma ficha separada')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('admin-file-upload')
    expect(markup).toContain('Selecionar imagens')
    expect(markup).toContain('Extrair e criar rascunhos')
    expect(markup).toContain('Rascunhos não aparecem no app')
    expect(markup).toContain('marcados com')
    expect(markup).toContain('admin-card')
    expect(markup).toContain('admin-primary-button')
    expect(markup).not.toContain('Nome da ficha')
    expect(markup).not.toContain('admin-stepper')
    expect(markup).not.toContain('Revisar extração')
    expect(markup).not.toContain('Etapa')
    expect(markup).not.toContain('Continuar para extração')
    expect(markup).not.toContain('Ainda não salvo')
    expect(markup).not.toContain('action="/api/admin/import/extract-workout"')
    expect(markup).not.toContain('<textarea')
  })

  it('renders a friendly import error message', () => {
    const markup = renderToStaticMarkup(<ImportWorkoutView error="upload_too_large" />)

    expect(markup).toContain('Imagem muito grande')
    expect(markup).toContain('Tentamos otimizar a imagem, mas ela ainda passou de 5 MB')
    expect(markup).toContain('admin-error-banner')
  })
})
