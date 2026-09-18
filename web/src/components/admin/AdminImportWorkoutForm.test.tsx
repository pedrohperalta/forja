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

  it('declares the one-photo-one-ficha rule and creates drafts straight from extraction', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ workout: createWorkout('Treino 3', 'Dead Hang') }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ planId: 'plan_treino_3_a1b2c3d4' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const locationAssign = vi.fn()
    stubLocationAssign(locationAssign)
    render(<AdminImportWorkoutForm />)

    expect(container.textContent).toContain('Cada foto vira uma ficha separada')
    expect(container.textContent).toContain('Extrair e criar rascunhos')
    expect(container.textContent).not.toContain('Nome da ficha')

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'treino-3.jpg', { type: 'image/jpeg' }),
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
      '/api/admin/import/create-plan',
      expect.objectContaining({
        body: JSON.stringify({ workout: createWorkout('Treino 3', 'Dead Hang') }),
        method: 'POST',
      }),
    )
    expect(locationAssign).toHaveBeenCalledWith('/admin/plans/plan_treino_3_a1b2c3d4')
    restoreLocation()
  })

  it('shows per-image progress while working and blocks the submit button', async () => {
    const firstExtract = createDeferred<Response>()
    const secondExtract = createDeferred<Response>()
    let callCount = 0
    const fetchMock = vi.fn(() => {
      callCount += 1
      if (callCount === 1) {
        return firstExtract.promise
      }
      if (callCount === 3) {
        return secondExtract.promise
      }
      return Promise.resolve(createResponse(`plan_step_${callCount}`))
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminImportWorkoutForm />)

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'treino-a.jpg', { type: 'image/jpeg' }),
      new File(['image'], 'treino-b.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Extraindo imagem 1 de 2')
    expect(getRequiredElement<HTMLButtonElement>('button[type="submit"]').disabled).toBe(true)

    await act(async () => {
      firstExtract.resolve(extractResponse(createWorkout('Treino 1', 'Supino')))
      await firstExtract.promise
    })

    expect(container.textContent).toContain('Extraindo imagem 2 de 2')
  })

  it('imports a batch of photos and lands on the list with the batch count', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(extractResponse(createWorkout('Treino 1', 'Supino Reto')))
      .mockResolvedValueOnce(createResponse('plan_treino_1_aaaa1111'))
      .mockResolvedValueOnce(extractResponse(createWorkout('Treino 2', 'Remada Baixa')))
      .mockResolvedValueOnce(createResponse('plan_treino_2_bbbb2222'))
    vi.stubGlobal('fetch', fetchMock)
    const locationAssign = vi.fn()
    stubLocationAssign(locationAssign)
    render(<AdminImportWorkoutForm />)

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['first'], 'treino-1.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'treino-2.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(locationAssign).toHaveBeenCalledWith('/admin/plans?imported=2')
    restoreLocation()
  })

  it('surfaces extraction failures and lets the admin try again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { code: 'model_output_invalid', message: 'nope' } }),
          { headers: { 'content-type': 'application/json' }, status: 422 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminImportWorkoutForm />)

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['image'], 'ruim.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Não foi possível extrair')
    expect(container.textContent).toContain('foto mais nítida')
    expect(getRequiredElement<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false)
  })

  it('reports partial progress when a photo fails mid-batch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(extractResponse(createWorkout('Treino 1', 'Supino')))
      .mockResolvedValueOnce(createResponse('plan_treino_1_aaaa1111'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'model_output_invalid', message: 'nope' } }), {
          headers: { 'content-type': 'application/json' },
          status: 422,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminImportWorkoutForm />)

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['ok'], 'boa.jpg', { type: 'image/jpeg' }),
      new File(['bad'], 'ruim.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Fichas parcialmente criadas')
    expect(container.textContent).toContain('1 de 2 fichas foram criadas')
    expect(container.textContent).toContain('ruim.jpg')
    expect(container.textContent).toContain('Reenvie as fotos restantes')
    expect(getRequiredElement<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false)
  })

  it('cancels the batch and reports the drafts created so far', async () => {
    const secondExtract = createDeferred<Response>()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(extractResponse(createWorkout('Treino 1', 'Supino')))
      .mockResolvedValueOnce(createResponse('plan_treino_1_aaaa1111'))
      .mockReturnValueOnce(secondExtract.promise)
    vi.stubGlobal('fetch', fetchMock)
    render(<AdminImportWorkoutForm />)

    setInputFiles(getRequiredElement<HTMLInputElement>('input[name="image"]'), [
      new File(['first'], 'treino-1.jpg', { type: 'image/jpeg' }),
      new File(['second'], 'treino-2.jpg', { type: 'image/jpeg' }),
    ])

    await act(async () => {
      getRequiredElement<HTMLFormElement>('form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Extraindo imagem 2 de 2')

    await act(async () => {
      getRequiredButton('Cancelar').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    await act(async () => {
      secondExtract.resolve(extractResponse(createWorkout('Treino 2', 'Remada')))
      await secondExtract.promise
    })

    expect(container.textContent).toContain('Importação cancelada')
    expect(container.textContent).toContain('1 de 2 fichas foram criadas')
    expect(container.textContent).toContain('Reenvie as fotos restantes')
    expect(getRequiredElement<HTMLButtonElement>('button[type="submit"]').disabled).toBe(false)
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
    const button = Array.from(container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.includes(name),
    )

    if (!button) {
      throw new Error(`Missing button: ${name}`)
    }

    return button
  }

  let originalLocation: Location | undefined

  function stubLocationAssign(assign: ReturnType<typeof vi.fn>): void {
    originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    })
  }

  function restoreLocation(): void {
    if (originalLocation) {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  }
})

function extractResponse(workout: unknown): Response {
  return new Response(JSON.stringify({ workout }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

function createResponse(planId: string): Response {
  return new Response(JSON.stringify({ planId }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

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
