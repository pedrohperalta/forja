import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NewPlanView } from './page'

describe('/admin/plans/new', () => {
  it('renders structured rebranded fields instead of raw JSON editing', () => {
    const markup = renderToStaticMarkup(createElement(NewPlanView))

    expect(markup).toContain('NOVO PLANO')
    expect(markup).toContain('Nome')
    expect(markup).toContain('Foco')
    expect(markup).toContain('Exercício inicial')
    expect(markup).toContain('Salvo como rascunho')
    expect(markup).toContain('Etapa 1 de 2')
    expect(markup).toContain('Criar rascunho')
    expect(markup).toContain('admin-card')
    expect(markup).toContain('admin-input')
    expect(markup).toContain('admin-linear-flow')
    expect(markup).toContain('admin-primary-button')
    expect(markup).toContain('Detalhes finos ficam na tela de edição')
    expect(markup).toContain('Padrões iniciais')
    expect(markup).toContain('Equipamento')
    expect(markup).toContain('Repetições')
    expect(markup).toContain('Séries')
    expect(markup).toContain('Descanso')
    expect(markup).not.toContain('Identificador')
    expect(markup).not.toContain('name="planId"')
    expect(markup).not.toContain('admin-form-grid')
    expect(markup).not.toContain('<textarea')
  })

  it('renders friendly creation errors', () => {
    const markup = renderToStaticMarkup(<NewPlanView error="create_failed" />)

    expect(markup).toContain('Não foi possível criar o plano')
    expect(markup).toContain('Revise os dados e tente novamente')
    expect(markup).toContain('admin-error-banner')
  })
})
