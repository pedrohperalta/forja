// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MuscleCategory, Plan } from '@forja/domain'

import { AdminPlanDraftForm } from './AdminPlanDraftForm'
import type { PublicationStatus } from '@/lib/publicationState'

const categoryOptions: readonly MuscleCategory[] = ['Peito', 'Costas']

const draft: Plan = {
  id: 'plan_a',
  label: 'A',
  name: 'Treino A',
  focus: 'Peito',
  exercises: [
    {
      id: 'supino',
      name: 'Supino Reto',
      category: 'Peito',
      equipment: 'Barra',
      reps: '10-12',
      sets: 3,
      restSeconds: 60,
      createdAt: '2026-05-18T12:00:00.000Z',
      updatedAt: '2026-05-18T12:00:00.000Z',
    },
    {
      id: 'remada',
      name: 'Remada Baixa',
      category: 'Costas',
      equipment: 'Máquina',
      reps: '10-12',
      sets: 3,
      restSeconds: 60,
      createdAt: '2026-05-18T12:00:00.000Z',
      updatedAt: '2026-05-18T12:00:00.000Z',
    },
  ],
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
}

const status: PublicationStatus = {
  label: 'Publicado com alterações',
  description: '',
  publishDescription: '',
  publishLabel: 'Publicar revisão',
  canPublish: true,
  tone: 'warning',
}

describe('AdminPlanDraftForm autosave', () => {
  let container: HTMLDivElement
  let root: Root
  const saveDraftAction = vi.fn<(formData: FormData) => Promise<void>>()

  beforeEach(() => {
    vi.useFakeTimers()
    saveDraftAction.mockReset()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('autosaves the draft after typing pauses and reports the save state', async () => {
    const deferred = createDeferred<void>()
    saveDraftAction.mockReturnValueOnce(deferred.promise)
    renderForm()

    expect(container.textContent).not.toContain('Salvando')

    const focusInput = getRequiredElement<HTMLInputElement>('input[name="focus"]')
    focusInput.value = 'Peito e Ombros'
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.textContent).toContain('Salvar agora')
    expect(saveDraftAction).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(1)
    const savedFormData = saveDraftAction.mock.calls[0]?.[0]
    expect(savedFormData?.get('focus')).toBe('Peito e Ombros')
    expect(container.textContent).toContain('Salvando')

    await act(async () => {
      deferred.resolve()
      await deferred.promise
    })

    expect(container.textContent).toContain('Salvo')
    expect(container.textContent).not.toContain('Salvar agora')
  })

  it('debounces consecutive edits into a single save', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    renderForm()

    const labelInput = getRequiredElement<HTMLInputElement>('input[name="label"]')
    await act(async () => {
      labelInput.value = 'B'
      labelInput.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(1000)
      labelInput.value = 'C'
      labelInput.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(1000)
    })

    expect(saveDraftAction).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(1)
    expect(saveDraftAction.mock.calls[0]?.[0].get('label')).toBe('C')
  })

  it('waits for required fields instead of saving an invalid draft', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    renderForm()

    const focusInput = getRequiredElement<HTMLInputElement>('input[name="focus"]')
    focusInput.value = ''
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(2000)
    })

    expect(saveDraftAction).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Salvar agora')
  })

  it('offers an explicit retry when a save fails', async () => {
    saveDraftAction.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined)
    renderForm()

    const focusInput = getRequiredElement<HTMLInputElement>('input[name="focus"]')
    focusInput.value = 'Costas'
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(container.textContent).toContain('Falhou ao salvar')
    expect(container.textContent).toContain('Tentar de novo')

    await act(async () => {
      getRequiredButton('Tentar de novo').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('Salvo')
    expect(container.textContent).not.toContain('Falhou ao salvar')
  })

  it('autosaves a keyboard reorder', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    renderForm()

    const dragHandle = getRequiredElement<HTMLButtonElement>(
      'button[aria-label^="Arraste para reordenar Supino"]',
    )
    await act(async () => {
      dragHandle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      )
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(1)
    expect(saveDraftAction.mock.calls[0]?.[0].get('exerciseOrder')).toBe('remada,supino')
  })

  it('does not autosave archived plans', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    renderForm({ archived: true })

    const focusInput = getRequiredElement<HTMLInputElement>('input[name="focus"]')
    expect(focusInput.disabled).toBe(true)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(saveDraftAction).not.toHaveBeenCalled()
  })

  function renderForm(overrides: Partial<Parameters<typeof AdminPlanDraftForm>[0]> = {}): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <AdminPlanDraftForm
          archived={false}
          categoryOptions={categoryOptions}
          draft={draft}
          latestRevisionNumber={1}
          planId="plan_a"
          previewHref="/admin/plans/plan_a/preview"
          publicationDiff={[]}
          publishAction={vi.fn()}
          removeExerciseAction={vi.fn()}
          saveDraftAction={saveDraftAction}
          status={status}
          {...overrides}
        /> satisfies ReactElement,
      )
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
