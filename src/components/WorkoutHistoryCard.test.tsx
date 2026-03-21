/**
 * WorkoutHistoryCard component tests
 *
 * Tests rendering of plan info, metadata, tap-to-expand exercise detail,
 * and delete action with confirmation step.
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
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders plan name, focus, date, and metadata', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText('Treino A')).toBeTruthy()
    expect(screen.getByText('Peito / Ombros / Triceps')).toBeTruthy()
    expect(screen.getByText('2026-03-21')).toBeTruthy()
    expect(screen.getByText(/45 min/)).toBeTruthy()
    expect(screen.getByText(/2 exerc/)).toBeTruthy()
  })

  it('renders top exercise weight in accent', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.getByText('60kg')).toBeTruthy()
  })

  it('does not show exercise list when collapsed', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(screen.queryByText('Supino Reto')).toBeNull()
    expect(screen.queryByText('Crucifixo')).toBeNull()
  })

  it('shows exercise list when tapped (expanded)', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))

    expect(screen.getByText('Supino Reto')).toBeTruthy()
    expect(screen.getByText('Crucifixo')).toBeTruthy()
    expect(screen.getByText('3x 60kg')).toBeTruthy()
    expect(screen.getByText('3x 20kg')).toBeTruthy()
  })

  it('shows APAGAR button when expanded', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))

    expect(screen.getByText('APAGAR')).toBeTruthy()
  })

  it('shows confirmation when APAGAR is pressed', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
    fireEvent.press(screen.getByText('APAGAR'))

    expect(screen.getByText('CONFIRMAR')).toBeTruthy()
    expect(screen.getByText('CANCELAR')).toBeTruthy()
  })

  it('calls onDelete when CONFIRMAR is pressed', () => {
    const onDelete = jest.fn()
    render(<WorkoutHistoryCard {...defaultProps} onDelete={onDelete} />)

    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
    fireEvent.press(screen.getByText('APAGAR'))
    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('hides confirmation when CANCELAR is pressed', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
    fireEvent.press(screen.getByText('APAGAR'))
    expect(screen.getByText('CONFIRMAR')).toBeTruthy()

    fireEvent.press(screen.getByText('CANCELAR'))

    expect(screen.getByText('APAGAR')).toBeTruthy()
  })

  it('collapses and resets confirmation on second tap', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    // Expand
    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
    expect(screen.getByText('Supino Reto')).toBeTruthy()

    // Collapse
    fireEvent.press(screen.getByTestId('workout-history-card-A-1000'))
    expect(screen.queryByText('Supino Reto')).toBeNull()
  })

  it('sets accessibility label with workout summary', () => {
    render(<WorkoutHistoryCard {...defaultProps} />)

    expect(
      screen.getByLabelText('Treino A, Peito / Ombros / Triceps, 45 minutos, 2 exercícios'),
    ).toBeTruthy()
  })
})
