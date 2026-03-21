/**
 * useRestTimer hook tests — Phase 4 (TDD)
 *
 * Tests countdown, progress, isFinished, and cleanup on unmount.
 */

import { renderHook, act } from '@testing-library/react-native'

import { useRestTimer } from './useRestTimer'

jest.mock('react-native-reanimated', () => {
  let sharedVal = { value: 0 }
  return {
    useSharedValue: jest.fn((init: number) => {
      sharedVal = { value: init }
      return sharedVal
    }),
    withTiming: jest.fn(
      (toValue: number, _config?: unknown, callback?: (finished: boolean) => void) => {
        // Immediately set the value for tests
        sharedVal.value = toValue
        if (callback) callback(true)
        return toValue
      },
    ),
    Easing: {
      linear: 'linear',
    },
    runOnJS: jest.fn((fn: (...args: unknown[]) => void) => fn),
    cancelAnimation: jest.fn(),
  }
})

describe('useRestTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts with full duration as secondsLeft', () => {
    const { result } = renderHook(() => useRestTimer(60))

    expect(result.current.secondsLeft).toBe(60)
    expect(result.current.isFinished).toBe(false)
  })

  it('counts down every second', () => {
    const { result } = renderHook(() => useRestTimer(60))

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.secondsLeft).toBe(59)
    expect(result.current.isFinished).toBe(false)
  })

  it('reaches zero and sets isFinished true', () => {
    const { result } = renderHook(() => useRestTimer(3))

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.isFinished).toBe(true)
  })

  it('does not go below zero', () => {
    const { result } = renderHook(() => useRestTimer(2))

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.secondsLeft).toBe(0)
    expect(result.current.isFinished).toBe(true)
  })

  it('cleans up interval on unmount', () => {
    const { unmount } = renderHook(() => useRestTimer(60))

    unmount()

    // Should not throw after unmount
    act(() => {
      jest.advanceTimersByTime(5000)
    })
  })

  it('returns progress shared value', () => {
    const { result } = renderHook(() => useRestTimer(60))

    // progress is a SharedValue — starts at 0
    expect(result.current.progress).toBeDefined()
    expect(result.current.progress.value).toBeDefined()
  })
})
