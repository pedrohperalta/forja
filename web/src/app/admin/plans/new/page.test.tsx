import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NewPlanView } from './page'

describe('/admin/plans/new', () => {
  it('offers three one-click creation paths instead of a form', () => {
    const markup = renderToStaticMarkup(
      createElement(NewPlanView, {
        plans: [{ plan: { id: 'plan_a', label: 'A' }, draftName: 'Treino A' }],
      }),
    )

    expect(markup).toContain('Como você quer começar?')
    expect(markup).toContain('admin-hub-cards')
    expect(markup).toContain('Em branco')
    expect(markup).toContain('Criar e abrir editor')
    expect(markup).toContain('Da foto da ficha')
    expect(markup).toContain('Enviar fotos')
    expect(markup).toContain('href="/admin/import"')
    expect(markup).toContain('Duplicar plano')
    expect(markup).toContain('name="sourcePlanId"')
    expect(markup).toContain('Treino A')
    expect(markup).toContain('Duplicar e abrir editor')
    expect(markup).toContain('nada aparece no app até publicar')
    expect(markup).toContain('admin-primary-button')

    expect(markup).not.toContain('name="name"')
    expect(markup).not.toContain('name="label"')
    expect(markup).not.toContain('name="focus"')
    expect(markup).not.toContain('Exercício inicial')
    expect(markup).not.toContain('admin-stepper')
    expect(markup).not.toContain('Começar com foco definido')
    expect(markup).not.toContain('<textarea')
  })

  it('teaches the next step when there is no plan to duplicate yet', () => {
    const markup = renderToStaticMarkup(createElement(NewPlanView))

    expect(markup).toContain('Nenhum plano ativo para duplicar')
    expect(markup).toContain('Criar e abrir editor')
    expect(markup).not.toContain('name="sourcePlanId"')
  })

  it('renders friendly creation errors', () => {
    const markup = renderToStaticMarkup(<NewPlanView error="create_failed" />)

    expect(markup).toContain('Não foi possível criar o plano')
    expect(markup).toContain('Revise os dados e tente novamente')
    expect(markup).toContain('admin-error-banner')
  })
})
