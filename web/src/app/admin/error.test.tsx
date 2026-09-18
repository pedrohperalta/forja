// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminErrorView, default as AdminError } from './error'

describe('admin error boundary', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('keeps the shell and offers a retry plus an escape to plans', () => {
    const markup = renderToMarkup(<AdminErrorView onRetry={() => {}} />)

    expect(markup).toContain('Algo saiu do trilho')
    expect(markup).toContain('Tentar de novo')
    expect(markup).toContain('href="/admin/plans"')
    expect(markup).toContain('admin-error-banner')
  })

  it('wires the default export reset to the retry button', () => {
    const reset = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(<AdminError error={Object.assign(new Error('boom'), { digest: 'x' })} reset={reset} />)
    })

    const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
      candidate.textContent?.includes('Tentar de novo'),
    )
    expect(button).toBeDefined()

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    expect(reset).toHaveBeenCalledTimes(1)
  })

  function renderToMarkup(element: ReactElement): string {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(element)
    })

    return container.innerHTML
  }
})
