/**
 * PendingExerciseCard tests — Phase 5 (TDD)
 *
 * Tests rendering of exercise name, badges, and action buttons.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { PendingExerciseCard } from './PendingExerciseCard'
import { makeExercise } from '@/test-utils/factories'

describe('PendingExerciseCard', () => {
  const defaultProps = {
    exercise: makeExercise('ex-1', { name: 'Supino Reto' }),
    onDoNow: jest.fn(),
    onRemove: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders exercise name', () => {
    render(<PendingExerciseCard {...defaultProps} />)

    expect(screen.getByText('Supino Reto')).toBeTruthy()
  })

  it('renders category badge', () => {
    render(<PendingExerciseCard {...defaultProps} />)

    expect(screen.getByText('Peito')).toBeTruthy()
  })

  it('renders equipment badge', () => {
    render(<PendingExerciseCard {...defaultProps} />)

    expect(screen.getByText('Maquina')).toBeTruthy()
  })

  it('renders "FAZER AGORA" button', () => {
    render(<PendingExerciseCard {...defaultProps} />)

    expect(screen.getByText('FAZER AGORA')).toBeTruthy()
  })

  it('renders "NÃO VOU FAZER" button', () => {
    render(<PendingExerciseCard {...defaultProps} />)

    expect(screen.getByText('NÃO VOU FAZER')).toBeTruthy()
  })

  it('calls onDoNow when "FAZER AGORA" is pressed', () => {
    const onDoNow = jest.fn()
    render(<PendingExerciseCard {...defaultProps} onDoNow={onDoNow} />)

    fireEvent.press(screen.getByText('FAZER AGORA'))

    expect(onDoNow).toHaveBeenCalledWith('ex-1')
  })

  it('calls onRemove when "NÃO VOU FAZER" is pressed', () => {
    const onRemove = jest.fn()
    render(<PendingExerciseCard {...defaultProps} onRemove={onRemove} />)

    fireEvent.press(screen.getByText('NÃO VOU FAZER'))

    expect(onRemove).toHaveBeenCalledWith('ex-1')
  })
})
