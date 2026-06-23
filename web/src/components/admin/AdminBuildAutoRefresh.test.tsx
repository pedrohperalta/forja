// @vitest-environment jsdom

import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminBuildAutoRefresh } from './AdminBuildAutoRefresh'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('AdminBuildAutoRefresh', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
    refresh.mockClear()
    vi.useRealTimers()
  })

  it('refreshes the current route while a build is running', () => {
    vi.useFakeTimers()
    render(<AdminBuildAutoRefresh enabled intervalMs={1000} />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(refresh).toHaveBeenCalledTimes(3)
    expect(container.textContent).toContain('Atualizando automaticamente')
  })

  it('does not refresh when there is no running build', () => {
    vi.useFakeTimers()
    render(<AdminBuildAutoRefresh enabled={false} intervalMs={1000} />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(refresh).not.toHaveBeenCalled()
    expect(container.textContent).toBe('')
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
