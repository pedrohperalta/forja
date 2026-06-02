/**
 * useHaptics hook tests — Track 5 (TDD: tests first)
 *
 * Tests all 5 feedback methods and web no-op behavior.
 */

import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { renderHook } from '@testing-library/react-native'

import { useHaptics } from './useHaptics'

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationFeedbackType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
  },
}))

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default to iOS (haptics available)
    Object.defineProperty(Platform, 'OS', { get: () => 'ios' })
  })

  describe('on native platform', () => {
    it('success() calls notificationAsync with Success', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.success()

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success,
      )
    })

    it('light() calls impactAsync with Light', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.light()

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light)
    })

    it('medium() calls impactAsync with Medium', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.medium()

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium)
    })

    it('heavy() calls impactAsync with Heavy', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.heavy()

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy)
    })

    it('warning() calls notificationAsync with Warning', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.warning()

      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning,
      )
    })
  })

  describe('on web platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { get: () => 'web' })
    })

    it('success() is a no-op', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.success()

      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })

    it('light() is a no-op', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.light()

      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })

    it('medium() is a no-op', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.medium()

      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })

    it('heavy() is a no-op', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.heavy()

      expect(Haptics.impactAsync).not.toHaveBeenCalled()
    })

    it('warning() is a no-op', () => {
      const { result } = renderHook(() => useHaptics())

      result.current.warning()

      expect(Haptics.notificationAsync).not.toHaveBeenCalled()
    })
  })
})
