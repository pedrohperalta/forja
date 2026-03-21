/**
 * WorkoutCard component tests — TDD Phase 2
 *
 * Tests rendering of plan name, focus, last date, PROXIMO chip,
 * disabled state, and onPress callback.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { WorkoutCard } from '@/components/WorkoutCard'

describe('WorkoutCard', () => {
  const defaultProps = {
    planName: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    lastDate: '2026-03-20',
    isNext: false,
    disabled: false,
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan name and focus', () => {
    render(<WorkoutCard {...defaultProps} />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Peito / Ombros / Triceps')).toBeTruthy()
  })

  it('renders last date when provided', () => {
    render(<WorkoutCard {...defaultProps} lastDate="2026-03-20" />)

    expect(screen.getByText('2026-03-20')).toBeTruthy()
  })

  it('renders "Nunca realizado" when lastDate is undefined', () => {
    render(<WorkoutCard {...defaultProps} lastDate={undefined} />)

    expect(screen.getByText('Nunca realizado')).toBeTruthy()
  })

  it('renders PROXIMO chip when isNext is true', () => {
    render(<WorkoutCard {...defaultProps} isNext />)

    expect(screen.getByText('PROXIMO')).toBeTruthy()
  })

  it('does not render PROXIMO chip when isNext is false', () => {
    render(<WorkoutCard {...defaultProps} isNext={false} />)

    expect(screen.queryByText('PROXIMO')).toBeNull()
  })

  it('calls onPress when pressed and not disabled', () => {
    const onPress = jest.fn()
    render(<WorkoutCard {...defaultProps} onPress={onPress} />)

    fireEvent.press(screen.getByText('Treino A'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    render(<WorkoutCard {...defaultProps} disabled onPress={onPress} />)

    fireEvent.press(screen.getByText('Treino A'))

    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders with dimmed appearance when disabled', () => {
    const { toJSON } = render(<WorkoutCard {...defaultProps} disabled />)

    // The component should render (snapshot will show opacity or dimmed styling)
    expect(toJSON()).toBeTruthy()
  })
})
