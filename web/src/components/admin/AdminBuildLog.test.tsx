// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { AdminBuildLog } from './AdminBuildLog'

describe('AdminBuildLog', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
  })

  it('renders the log without hijacking page scroll or re-announcing to screen readers', () => {
    render(<AdminBuildLog log="linha 1" />)

    const pre = getRequiredElement('pre.admin-build-log')

    expect(pre.textContent).toContain('linha 1')
    expect(pre.getAttribute('aria-live')).toBeNull()
    expect(pre.getAttribute('role')).toBeNull()
  })

  it('keeps the container pinned to the bottom while the reader follows the log', () => {
    render(<AdminBuildLog log="linha 1" />)

    const pre = getRequiredElement<HTMLPreElement>('pre.admin-build-log')
    Object.defineProperty(pre, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(pre, 'clientHeight', { configurable: true, value: 300 })
    pre.scrollTop = 700

    rerender(<AdminBuildLog log={'linha 1\nlinha 2'} />)

    expect(pre.scrollTop).toBe(1000)
  })

  it('stops autoscrolling once the reader scrolls up', () => {
    render(<AdminBuildLog log="linha 1" />)

    const pre = getRequiredElement<HTMLPreElement>('pre.admin-build-log')
    Object.defineProperty(pre, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(pre, 'clientHeight', { configurable: true, value: 300 })
    pre.scrollTop = 200

    rerender(<AdminBuildLog log={'linha 1\nlinha 2\nlinha 3'} />)

    expect(pre.scrollTop).toBe(200)
  })

  it('shows a waiting message before any output exists', () => {
    render(<AdminBuildLog log="" />)

    expect(getRequiredElement('pre.admin-build-log').textContent).toContain(
      'Aguardando saída do processo',
    )
  })

  function render(element: ReactElement): void {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    act(() => {
      root.render(element)
    })
  }

  function rerender(element: ReactElement): void {
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
})
