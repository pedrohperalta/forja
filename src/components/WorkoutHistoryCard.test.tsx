/**
 * WorkoutHistoryCard component tests — TDD Phase 5
 *
 * Tests rendering of plan info, metadata, exercise summary,
 * delete button, and inline confirmation.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { WorkoutHistoryCard } from '@/components/WorkoutHistoryCard'
import type { WorkoutId, PlanId, CompletedExercise } from '@/types'

describe('WorkoutHistoryCard', () => {
  const exercises: CompletedExercise[] = [
    { name: 'Supino Reto', sets: 3, weight: 60 },
    { name: 'Crucifixo', sets: 3, weight: 20 },
  ]

  const defaultProps = {
    id: 'A-1000' as WorkoutId,
    planId: 'A' as PlanId,
    planName: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    date: '2026-03-21',
    durationMinutes: 45,
    exercises,
    isDeleting: false,
    onDelete: jest.fn(),
    onConfirmDelete: jest.fn(),
    onCancelDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan name and focus', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Peito / Ombros / Triceps')).toBeTruthy()
  })

  it('renders date and duration metadata', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText('2026-03-21')).toBeTruthy()
    expect(screen.getByText(/45 min/)).toBeTruthy()
  })

  it('renders exercise count', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText(/2 exerc/i)).toBeTruthy()
  })

  it('renders exercise summary with weights', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText(/Supino Reto/)).toBeTruthy()
    expect(screen.getByText(/60/)).toBeTruthy()
  })

  it('shows APAGAR button in default state', () => {
    render(<WorkoutHistoryCard {...defaultProps} isDeleting={false} />)

    expect(screen.getByText('APAGAR')).toBeTruthy()
    expect(screen.queryByText('CONFIRMAR')).toBeNull()
  })

  it('calls onDelete when APAGAR is pressed', () => {
    const onDelete = jest.fn()
    render(<WorkoutHistoryCard {...defaultProps} onDelete={onDelete} />)

    fireEvent.press(screen.getByText('APAGAR'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('shows confirmation buttons when isDeleting is true', () => {
    render(<WorkoutHistoryCard {...defaultProps} isDeleting />)

    expect(screen.getByText('CONFIRMAR')).toBeTruthy()
    expect(screen.getByText('CANCELAR')).toBeTruthy()
    expect(screen.queryByText('APAGAR')).toBeNull()
  })

  it('calls onConfirmDelete when CONFIRMAR is pressed', () => {
    const onConfirmDelete = jest.fn()
    render(
      <WorkoutHistoryCard
        {...defaultProps}
        isDeleting
        onConfirmDelete={onConfirmDelete}
      />,
    )

    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(onConfirmDelete).toHaveBeenCalledTimes(1)
  })

  it('calls onCancelDelete when CANCELAR is pressed', () => {
    const onCancelDelete = jest.fn()
    render(
      <WorkoutHistoryCard
        {...defaultProps}
        isDeleting
        onCancelDelete={onCancelDelete}
      />,
    )

    fireEvent.press(screen.getByText('CANCELAR'))

    expect(onCancelDelete).toHaveBeenCalledTimes(1)
  })
})
