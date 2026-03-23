/**
 * useTwoStepDelete hook tests
 *
 * Tests the two-step delete pattern: idle -> requestDelete -> confirming -> confirmDelete/cancelDelete.
 */

import { renderHook, act } from '@testing-library/react-native'
import { useTwoStepDelete } from '@/hooks/useTwoStepDelete'

describe('useTwoStepDelete', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts in idle state', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    expect(result.current.deleteState).toBe('idle')
  })

  it('transitions to confirming when requestDelete is called', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    expect(result.current.deleteState).toBe('confirming')
  })

  it('calls onDelete and returns to idle when confirmDelete is called', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    act(() => {
      result.current.confirmDelete()
    })

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(result.current.deleteState).toBe('idle')
  })

  it('returns to idle when cancelDelete is called', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    act(() => {
      result.current.cancelDelete()
    })

    expect(result.current.deleteState).toBe('idle')
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('auto-resets to idle after timeout', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    expect(result.current.deleteState).toBe('confirming')

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.deleteState).toBe('idle')
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('clears timeout when confirmDelete is called before timeout', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    act(() => {
      result.current.confirmDelete()
    })

    // Advance past timeout — should not change state
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.deleteState).toBe('idle')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('clears timeout when cancelDelete is called before timeout', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.requestDelete()
    })

    act(() => {
      result.current.cancelDelete()
    })

    // Advance past timeout — should remain idle
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.deleteState).toBe('idle')
  })

  it('does not call onDelete when confirmDelete is called in idle state', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete))

    act(() => {
      result.current.confirmDelete()
    })

    expect(onDelete).not.toHaveBeenCalled()
  })

  it('accepts custom timeout duration', () => {
    const onDelete = jest.fn()
    const { result } = renderHook(() => useTwoStepDelete(onDelete, 3000))

    act(() => {
      result.current.requestDelete()
    })

    expect(result.current.deleteState).toBe('confirming')

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.deleteState).toBe('idle')
  })
})
