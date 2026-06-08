import { render, waitFor } from '@testing-library/react-native'

import AuthCallbackScreen from '@/app/auth/callback'
import { useAuthStore } from '@/stores/authStore'

const mockReplace = jest.fn()
const mockHandleAuthCallback = jest.fn()
let mockCallbackCode: string | undefined = 'callback-code'

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ code: mockCallbackCode }),
  useRouter: () => ({ replace: mockReplace }),
}))

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      handleAuthCallback: mockHandleAuthCallback,
    }),
  },
}))

describe('AuthCallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCallbackCode = 'callback-code'
  })

  it('exchanges callback code through the auth store and navigates to history', async () => {
    mockHandleAuthCallback.mockResolvedValueOnce(undefined)

    render(<AuthCallbackScreen />)

    await waitFor(() => {
      expect(mockHandleAuthCallback).toHaveBeenCalledWith('callback-code')
      expect(mockReplace).toHaveBeenCalledWith('/history')
    })
  })

  it('returns home when code is missing', async () => {
    mockCallbackCode = undefined

    render(<AuthCallbackScreen />)

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/')
    })
    expect(useAuthStore.getState().handleAuthCallback).not.toHaveBeenCalled()
  })
})
