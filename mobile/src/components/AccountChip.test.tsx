/**
 * AccountChip component tests — TDD Phase 2
 *
 * Small top-right affordance that surfaces login/account access
 * independently of whether the user has workout history yet.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { AccountChip } from '@/components/AccountChip'

describe('AccountChip', () => {
  it('shows "ENTRAR" label when user is not authenticated', () => {
    render(<AccountChip authenticated={false} onPress={jest.fn()} />)

    expect(screen.getByText('ENTRAR')).toBeTruthy()
  })

  it('does not show "ENTRAR" label when user is authenticated', () => {
    render(<AccountChip authenticated={true} onPress={jest.fn()} />)

    expect(screen.queryByText('ENTRAR')).toBeNull()
  })

  it('calls onPress when pressed (logged out)', () => {
    const onPress = jest.fn()
    render(<AccountChip authenticated={false} onPress={onPress} />)

    fireEvent.press(screen.getByText('ENTRAR'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('calls onPress when pressed (logged in)', () => {
    const onPress = jest.fn()
    render(<AccountChip authenticated={true} onPress={onPress} />)

    fireEvent.press(screen.getByLabelText('Conta'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('uses a distinct accessibility label per auth state', () => {
    const { rerender } = render(<AccountChip authenticated={false} onPress={jest.fn()} />)
    expect(screen.getByLabelText('Entrar')).toBeTruthy()

    rerender(<AccountChip authenticated={true} onPress={jest.fn()} />)
    expect(screen.getByLabelText('Conta')).toBeTruthy()
  })
})
