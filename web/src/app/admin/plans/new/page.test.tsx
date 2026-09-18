import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NewPlanView } from './page'

describe('/admin/plans/new', () => {
  it('asks only for the name and defers everything else to the editor', () => {
    const markup = renderToStaticMarkup(createElement(NewPlanView))

    expect(markup).toContain('NOVO PLANO')
    expect(markup).toContain('name="name"')
    expect(markup).toContain('Um nome basta')
    expect(markup).toContain('Criar e abrir editor')
    expect(markup).toContain('admin-card')
    expect(markup).toContain('admin-input')
    expect(markup).toContain('admin-linear-flow')
    expect(markup).toContain('admin-primary-button')
    expect(markup).toContain('Rascunho')
    expect(markup).toContain('gerado a partir do nome')

    expect(markup).not.toContain('name="label"')
    expect(markup).not.toContain('Rótulo')
    expect(markup).not.toContain('Exercício inicial')
    expect(markup).not.toContain('Etapa 1 de 2')
    expect(markup).not.toContain('admin-stepper')
    expect(markup).not.toContain('Padrões iniciais')
    expect(markup).not.toContain('name="exerciseName"')
    expect(markup).not.toContain('name="planId"')
    expect(markup).not.toContain('admin-form-grid')
    expect(markup).not.toContain('<textarea')
    expect(markup).not.toContain('nasce como draft')
  })

  it('keeps focus optional behind progressive disclosure', () => {
    const markup = renderToStaticMarkup(createElement(NewPlanView))

    expect(markup).toContain('Começar com foco definido')
    expect(markup).toContain('name="focus"')
    expect(markup).not.toContain('Foco</span><input class="admin-input" required')
  })

  it('renders friendly creation errors', () => {
    const markup = renderToStaticMarkup(<NewPlanView error="create_failed" />)

    expect(markup).toContain('Não foi possível criar o plano')
    expect(markup).toContain('Revise os dados e tente novamente')
    expect(markup).toContain('admin-error-banner')
  })
})
