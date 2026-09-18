// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MuscleCategory, Plan } from '@forja/domain'

import { AdminPlanDraftForm } from './AdminPlanDraftForm'

const routerRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}))

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

describe('AdminPlanDraftForm autosave', () => {
  let container: HTMLDivElement
  let root: Root
  const saveDraftAction = vi.fn<(formData: FormData) => Promise<void>>()

  beforeEach(() => {
    vi.useFakeTimers()
    saveDraftAction.mockReset()
    routerRefresh.mockReset()
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

  it('announces reorders so the footer autosave can persist them', async () => {
    const changedListener = vi.fn()
    renderForm()
    getRequiredElement<HTMLFormElement>('form').addEventListener('admin-draft-changed', changedListener)

    const dragHandle = getRequiredElement<HTMLButtonElement>(
      'button[aria-label^="Arraste para reordenar Supino"]',
    )
    await act(async () => {
      dragHandle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
      )
    })

    expect(changedListener).toHaveBeenCalledTimes(1)
    expect(getRequiredElement<HTMLInputElement>('input[name="exerciseOrder"]').value).toBe(
      'remada,supino',
    )
  })

  it('removes an exercise through a direct action call and refreshes the page', async () => {
    const removeExerciseAction = vi.fn<(formData: FormData) => Promise<void>>()
    removeExerciseAction.mockResolvedValue(undefined)
    renderForm({ removeExerciseAction })

    await act(async () => {
      getRequiredButton('Confirmar remoção').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(removeExerciseAction).toHaveBeenCalledTimes(1)
    const removalFormData = removeExerciseAction.mock.calls[0]?.[0]
    expect(removalFormData?.get('planId')).toBe('plan_a')
    expect(removalFormData?.get('removeExerciseId')).toBe('supino')
    expect(routerRefresh).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('Não foi possível remover')
  })

  it('surfaces a removal failure without losing the exercise card', async () => {
    const removeExerciseAction = vi.fn<(formData: FormData) => Promise<void>>()
    removeExerciseAction.mockRejectedValueOnce(new Error('boom'))
    renderForm({ removeExerciseAction })

    await act(async () => {
      getRequiredButton('Confirmar remoção').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(container.textContent).toContain('Não foi possível remover')
    expect(container.textContent).toContain('Supino Reto')
    expect(routerRefresh).not.toHaveBeenCalled()
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
          removeExerciseAction={(formData: FormData): Promise<void> => {
            void formData
            return Promise.resolve()
          }}
          saveDraftAction={saveDraftAction}
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

