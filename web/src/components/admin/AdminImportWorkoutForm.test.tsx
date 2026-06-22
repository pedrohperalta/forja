// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminImportWorkoutForm } from './AdminImportWorkoutForm'

describe('AdminImportWorkoutForm', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
    vi.unstubAllGlobals()
  })

  it('shows extraction progress and renders the API response as a structured review', async () => {
    const deferred = createDeferred<Response>()
    const fetchMock = vi.fn(() => deferred.promise)
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminImportWorkoutForm />)

    const form = getRequiredElement<HTMLFormElement>('form')
    const label = getRequiredElement<HTMLInputElement>('input[name="label"]')
    label.value = 'Treino A'
    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'treino-a.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/import/extract-workout',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
        method: 'POST',
      }),
    )
    expect(container.textContent).toContain('Extraindo com IA')
    expect(container.textContent).toContain('Enviando imagem para a IA')
    expect(getRequiredElement<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true)

    await act(async () => {
      deferred.resolve(
        new Response(
          JSON.stringify({
            workout: {
              name: 'Treino 1 - Hipertrofia',
              exercises: [
                {
                  name: 'Supino Reto',
                  category: 'Peito',
                  sets: 3,
                  reps: '8-12',
                  restSeconds: 60,
                  equipment: 'Barra',
                  confidence: 0.95,
                },
              ],
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      await deferred.promise
    })

    expect(container.textContent).toContain('Extração concluída')
    expect(container.textContent).toContain('Treino 1 - Hipertrofia')
    expect(container.textContent).toContain('Supino Reto')
    expect(container.textContent).toContain('3 séries')
    expect(container.textContent).toContain('8-12 reps')
    expect(container.textContent).toContain('Ainda não salvo')
    expect(container.textContent).toContain('Salvar rascunho e revisar')
    expect(container.textContent).toContain('Descartar extração')
    expect(container.textContent).not.toContain('Extrair outra ficha')
    expect(container.textContent).not.toContain('{"workout"')
  })

  it('requires an explicit confirmation before discarding an extracted workout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workout: {
              name: 'Treino 3',
              exercises: [
                {
                  name: 'Dead Hang',
                  category: 'Costas',
                  sets: 2,
                  reps: '6-10',
                  restSeconds: 60,
                  equipment: 'Barra',
                  confidence: 0.85,
                },
              ],
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      ),
    )
    render(<AdminImportWorkoutForm />)

    getRequiredElement<HTMLInputElement>('input[name="label"]').value = 'Treino 3'
    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'treino-3.jpg', { type: 'image/jpeg' }),
    ])
    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    await act(async () => {
      getRequiredButton('Descartar extração').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Confirmar descarte')
    expect(container.textContent).toContain('Treino 3')

    await act(async () => {
      getRequiredButton('Confirmar descarte').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Enviar imagens')
    expect(container.textContent).not.toContain('Treino 3')
  })

  it('saves the extracted workout as a draft and sends the admin to the editor', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workout: {
              name: 'Treino 3',
              exercises: [
                {
                  name: 'Dead Hang',
                  category: 'Costas',
                  sets: 2,
                  reps: '6-10',
                  restSeconds: 60,
                  equipment: 'Barra',
                  confidence: 0.85,
                },
              ],
            },
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ planId: 'plan_treino_3' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: vi.fn() },
    })
    render(<AdminImportWorkoutForm />)

    getRequiredElement<HTMLInputElement>('input[name="label"]').value = 'Treino 3'
    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'treino-3.jpg', { type: 'image/jpeg' }),
    ])
    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    const saveButton = getRequiredButton('Salvar rascunho e revisar')

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/admin/import/create-plan',
      expect.objectContaining({
        body: JSON.stringify({
          workout: {
            name: 'Treino 3',
            exercises: [
              {
                name: 'Dead Hang',
                category: 'Costas',
                sets: 2,
                reps: '6-10',
                restSeconds: 60,
                equipment: 'Barra',
                confidence: 0.85,
              },
            ],
          },
        }),
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
        method: 'POST',
      }),
    )
    expect(window.location.assign).toHaveBeenCalledWith('/admin/plans/plan_treino_3')

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  it('extracts and saves multiple selected images in one batch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workout: createWorkout('Treino 1', 'Supino Reto'),
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workout: createWorkout('Treino 2', 'Remada Baixa'),
          }),
          { headers: { 'content-type': 'application/json' }, status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ planId: 'plan_treino_1' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ planId: 'plan_treino_2' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign: vi.fn() },
    })
    render(<AdminImportWorkoutForm />)

    getRequiredElement<HTMLInputElement>('input[name="label"]').value = 'Treino'
    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['first'], 'treino-1.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'treino-2.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/import/extract-workout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/import/extract-workout',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(container.textContent).toContain('2 fichas extraídas')
    expect(container.textContent).toContain('Treino 1')
    expect(container.textContent).toContain('Treino 2')
    expect(container.textContent).toContain('Salvar 2 rascunhos')

    await act(async () => {
      getRequiredButton('Salvar 2 rascunhos').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/admin/import/create-plan',
      expect.objectContaining({
        body: JSON.stringify({ workout: createWorkout('Treino 1', 'Supino Reto') }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/admin/import/create-plan',
      expect.objectContaining({
        body: JSON.stringify({ workout: createWorkout('Treino 2', 'Remada Baixa') }),
      }),
    )
    expect(window.location.assign).toHaveBeenCalledWith('/admin/plans')

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
  })

  function render(element: ReactElement): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(element)
    })
  }

  function getRequiredElement<ElementType extends Element>(selector: string): ElementType {
    const element = container.querySelector<ElementType>(selector)

    if (!element) {
      throw new Error(`Missing element for selector: ${selector}`)
    }

    return element
  }

  function getRequiredButton(name: string): HTMLButtonElement {
    const buttons = Array.from(container.querySelectorAll('button'))
    const button = buttons.find((candidate) => candidate.textContent?.includes(name))

    if (!button) {
      throw new Error(`Missing button: ${name}`)
    }

    return button
  }
})

function createWorkout(
  name: string,
  exerciseName: string,
): {
  name: string
  exercises: Array<{
    name: string
    category: string
    sets: number
    reps: string
    restSeconds: number
    equipment: string
    confidence: number
  }>
} {
  return {
    name,
    exercises: [
      {
        name: exerciseName,
        category: 'Costas',
        sets: 2,
        reps: '6-10',
        restSeconds: 60,
        equipment: 'Barra',
        confidence: 0.85,
      },
    ],
  }
}

function setInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  })
}

function createDeferred<Value>(): {
  promise: Promise<Value>
  resolve: (value: Value) => void
} {
  let resolve: (value: Value) => void = () => {}
  const promise = new Promise<Value>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}
