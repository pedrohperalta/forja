// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminEditorFooter } from './AdminEditorFooter'
import type { PublicationStatus } from '@/lib/publicationState'

const status: PublicationStatus = {
  label: 'Publicado com alterações',
  description: 'A versão no app é anterior; suas edições ainda não foram publicadas.',
  publishDescription: 'Publique a revisão para atualizar o app.',
  publishLabel: 'Publicar revisão',
  canPublish: true,
  tone: 'warning',
}

const FORM_ID = 'plan-draft-plan_a'

function createTestForm(): HTMLFormElement {
  const form = document.createElement('form')
  form.id = FORM_ID
  form.innerHTML =
    '<input name="planId" value="plan_a" /><input name="focus" required value="Peito" />'
  document.body.append(form)
  return form
}

describe('AdminEditorFooter', () => {
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
    document.getElementById(FORM_ID)?.remove()
  })

  it('autosaves the associated draft form after edits pause', async () => {
    const deferred = createDeferred<void>()
    saveDraftAction.mockReturnValueOnce(deferred.promise)
    const form = createTestForm()
    renderFooter()

    const focusInput = getRequiredInput(form, 'focus')
    focusInput.value = 'Peito e Ombros'
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.textContent).toContain('Salvar agora')
    expect(container.textContent).toContain('Alterações não salvas')
    expect(saveDraftAction).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(1500)
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(1)
    expect(saveDraftAction.mock.calls[0]?.[0].get('focus')).toBe('Peito e Ombros')
    expect(container.textContent).toContain('Salvando')

    await act(async () => {
      deferred.resolve()
      await deferred.promise
    })

    expect(container.textContent).toContain('Salvo')
    expect(container.textContent).not.toContain('Salvar agora')
  })

  it('saves immediately when the form announces a structural change', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    const form = createTestForm()
    renderFooter()

    await act(async () => {
      form.dispatchEvent(new CustomEvent('admin-draft-changed'))
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(1)
  })

  it('skips saving while the form is invalid and offers a manual retry on failure', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    const form = createTestForm()
    renderFooter()

    const focusInput = getRequiredInput(form, 'focus')
    focusInput.value = ''
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
      vi.advanceTimersByTime(2000)
    })

    expect(saveDraftAction).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Não salvo — corrija os campos destacados')

    saveDraftAction.mockRejectedValueOnce(new Error('boom'))
    focusInput.value = 'Costas'
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(container.textContent).toContain('Falhou ao salvar')

    saveDraftAction.mockResolvedValueOnce(undefined)
    await act(async () => {
      getRequiredButton('Tentar de novo').dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(saveDraftAction).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('Salvo')
  })

  it('warns before leaving while there are unsaved edits, and stays silent once saved', async () => {
    saveDraftAction.mockResolvedValue(undefined)
    const form = createTestForm()
    renderFooter()

    const focusInput = getRequiredInput(form, 'focus')
    focusInput.value = 'Peito e Ombros'
    await act(async () => {
      focusInput.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const dirtyUnloadEvent = new Event('beforeunload', { cancelable: true })
    const dirtyPreventDefault = vi.spyOn(dirtyUnloadEvent, 'preventDefault')
    await act(async () => {
      window.dispatchEvent(dirtyUnloadEvent)
    })

    expect(dirtyPreventDefault).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    const cleanUnloadEvent = new Event('beforeunload', { cancelable: true })
    const cleanPreventDefault = vi.spyOn(cleanUnloadEvent, 'preventDefault')
    await act(async () => {
      window.dispatchEvent(cleanUnloadEvent)
    })

    expect(cleanPreventDefault).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Salvo')
  })

  it('associates the publish control with the draft form outside of it', () => {
    createTestForm()
    renderFooter()

    const publishButton = getRequiredButton('Publicar revisão')

    expect(publishButton.getAttribute('form')).toBe(FORM_ID)
    expect(publishButton.type).toBe('submit')
    expect(container.textContent).toContain('Pré-visualizar')
  })

  it('renders the publication diff right above the bar', () => {
    createTestForm()
    renderFooter({
      latestRevisionNumber: 3,
      publicationDiff: [
        { kind: 'exercise-added', exerciseName: 'Elevação Lateral' },
      ],
    })

    expect(container.textContent).toContain('1 alteração desde a Rev. 3')
    expect(container.textContent).toContain('Adicionado: Elevação Lateral')
    expect(container.innerHTML.indexOf('admin-publish-diff')).toBeLessThan(
      container.innerHTML.indexOf('admin-editor-actionbar'),
    )
  })

  function renderFooter(
    overrides: Partial<Parameters<typeof AdminEditorFooter>[0]> = {},
  ): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <AdminEditorFooter
          archived={false}
          formId={FORM_ID}
          latestRevisionNumber={1}
          previewHref="/admin/plans/plan_a/preview"
          publicationDiff={[]}
          publishAction={(formData: FormData): Promise<void> => {
            void formData
            return Promise.resolve()
          }}
          restoreAction={(formData: FormData): Promise<void> => {
            void formData
            return Promise.resolve()
          }}
          saveDraftAction={saveDraftAction}
          status={status}
          {...overrides}
        /> satisfies ReactElement,
      )
    })
  }

  function getRequiredInput(form: HTMLFormElement, name: string): HTMLInputElement {
    const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`)

    if (!input) {
      throw new Error(`Missing input: ${name}`)
    }

    return input
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
