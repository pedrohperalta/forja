/**
 * PlanCard component tests
 *
 * Tests rendering of plan info (label, name, focus, exercise count),
 * tap callback, and two-step delete pattern.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { PlanCard } from '@/components/PlanCard'
import type { PlanId } from '@/types'

describe('PlanCard', () => {
  const defaultProps = {
    id: 'plan-1' as PlanId,
    label: 'A',
    name: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    exerciseCount: 7,
    onPress: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan label', () => {
    render(<PlanCard {...defaultProps} />)

    expect(screen.getByText('A')).toBeTruthy()
  })

  it('renders plan name', () => {
    render(<PlanCard {...defaultProps} />)

    expect(screen.getByText('Treino A')).toBeTruthy()
  })

  it('renders plan focus', () => {
    render(<PlanCard {...defaultProps} />)

    expect(screen.getByText('Peito / Ombros / Triceps')).toBeTruthy()
  })

  it('renders exercise count', () => {
    render(<PlanCard {...defaultProps} />)

    expect(screen.getByText('7 exercicios')).toBeTruthy()
  })

  it('renders singular exercise count', () => {
    render(<PlanCard {...defaultProps} exerciseCount={1} />)

    expect(screen.getByText('1 exercicio')).toBeTruthy()
  })

  it('calls onPress when card is tapped', () => {
    const onPress = jest.fn()
    render(<PlanCard {...defaultProps} onPress={onPress} />)

    fireEvent.press(screen.getByText('Treino A'))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows APAGAR button', () => {
    render(<PlanCard {...defaultProps} />)

    expect(screen.getByText('APAGAR')).toBeTruthy()
  })

  it('shows confirmation buttons when APAGAR is pressed', () => {
    render(<PlanCard {...defaultProps} />)

    fireEvent.press(screen.getByText('APAGAR'))

    expect(screen.getByText('CONFIRMAR')).toBeTruthy()
    expect(screen.getByText('CANCELAR')).toBeTruthy()
  })

  it('calls onDelete when CONFIRMAR is pressed', () => {
    const onDelete = jest.fn()
    render(<PlanCard {...defaultProps} onDelete={onDelete} />)

    fireEvent.press(screen.getByText('APAGAR'))
    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('hides confirmation when CANCELAR is pressed', () => {
    render(<PlanCard {...defaultProps} />)

    fireEvent.press(screen.getByText('APAGAR'))
    expect(screen.getByText('CONFIRMAR')).toBeTruthy()

    fireEvent.press(screen.getByText('CANCELAR'))

    expect(screen.getByText('APAGAR')).toBeTruthy()
    expect(screen.queryByText('CONFIRMAR')).toBeNull()
  })

  it('renders zero exercise count', () => {
    render(<PlanCard {...defaultProps} exerciseCount={0} />)

    expect(screen.getByText('0 exercicios')).toBeTruthy()
  })
})
