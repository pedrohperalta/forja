/**
 * ExtractedExerciseRow component tests
 *
 * Tests display-only rendering of extracted exercise data:
 * name, category, sets x reps, equipment, and confidence badge.
 * Edit mode is added in Track 3.
 */

import { render, screen } from '@testing-library/react-native'
import { ExtractedExerciseRow } from '@/components/import/ExtractedExerciseRow'

describe('ExtractedExerciseRow', () => {
  const defaultProps = {
    name: 'Supino Reto',
    category: 'Peito',
    sets: 3,
    reps: '10-12',
    equipment: 'Barra',
    confidence: 0.95,
  }

  it('renders exercise name', () => {
    render(<ExtractedExerciseRow {...defaultProps} />)

    expect(screen.getByText('Supino Reto')).toBeTruthy()
  })

  it('renders category badge', () => {
    render(<ExtractedExerciseRow {...defaultProps} />)

    expect(screen.getByText('Peito')).toBeTruthy()
  })

  it('renders sets and reps', () => {
    render(<ExtractedExerciseRow {...defaultProps} />)

    expect(screen.getByText('3 x 10-12')).toBeTruthy()
  })

  it('renders equipment badge', () => {
    render(<ExtractedExerciseRow {...defaultProps} />)

    expect(screen.getByText('Barra')).toBeTruthy()
  })

  it('renders confidence badge with percentage', () => {
    render(<ExtractedExerciseRow {...defaultProps} />)

    expect(screen.getByText('95%')).toBeTruthy()
  })

  it('renders with different exercise data', () => {
    render(
      <ExtractedExerciseRow
        name="Leg Press"
        category="Quadriceps"
        sets={4}
        reps="8-10"
        equipment="Maquina"
        confidence={0.72}
      />,
    )

    expect(screen.getByText('Leg Press')).toBeTruthy()
    expect(screen.getByText('Quadriceps')).toBeTruthy()
    expect(screen.getByText('4 x 8-10')).toBeTruthy()
    expect(screen.getByText('Maquina')).toBeTruthy()
    expect(screen.getByText('72%')).toBeTruthy()
  })

  it('renders low confidence badge', () => {
    render(<ExtractedExerciseRow {...defaultProps} confidence={0.3} />)

    expect(screen.getByLabelText('Confianca 30%')).toBeTruthy()
  })
})
