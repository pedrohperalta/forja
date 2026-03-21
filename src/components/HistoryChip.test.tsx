/**
 * HistoryChip component tests — TDD Phase 2
 *
 * Tests rendering of "Historico" label with count badge and onPress callback.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { HistoryChip } from '@/components/HistoryChip'

describe('HistoryChip', () => {
  const defaultProps = {
    count: 3,
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders "Historico" label', () => {
    render(<HistoryChip {...defaultProps} />)

    expect(screen.getByText('Historico')).toBeTruthy()
  })

  it('renders count badge', () => {
    render(<HistoryChip {...defaultProps} count={7} />)

    expect(screen.getByText('7')).toBeTruthy()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    render(<HistoryChip {...defaultProps} onPress={onPress} />)

    fireEvent.press(screen.getByText('Historico'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
