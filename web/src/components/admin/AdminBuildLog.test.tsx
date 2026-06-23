// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminBuildLog } from './AdminBuildLog'

describe('AdminBuildLog', () => {
  let container: HTMLDivElement
  let root: Root
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('scrolls to the newest log line when log content changes', () => {
    render(<AdminBuildLog log="Linha 1" />)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    act(() => {
      root.render(<AdminBuildLog log={'Linha 1\nLinha 2'} />)
    })

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('Linha 2')
  })

  function render(element: ReactElement): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(element)
    })
  }
})
