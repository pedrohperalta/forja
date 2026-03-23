/**
 * ExerciseRow component tests
 *
 * Tests rendering of exercise info (name, category, sets x reps, rest time),
 * edit callback, and two-step delete pattern.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { ExerciseRow } from '@/components/ExerciseRow'
import type { ExerciseId } from '@/types'

describe('ExerciseRow', () => {
  const defaultProps = {
    id: 'ex-1' as ExerciseId,
    name: 'Supino Reto',
    category: 'Peito',
    equipment: 'Maquina',
    sets: 3,
    reps: '10-12',
    restSeconds: 60,
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders exercise name', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('Supino Reto')).toBeTruthy()
  })

  it('renders category badge', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('Peito')).toBeTruthy()
  })

  it('renders sets and reps', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('3 x 10-12')).toBeTruthy()
  })

  it('renders rest time', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('60s')).toBeTruthy()
  })

  it('renders rest time of 90 seconds', () => {
    render(<ExerciseRow {...defaultProps} restSeconds={90} />)

    expect(screen.getByText('90s')).toBeTruthy()
  })

  it('calls onEdit when edit button is pressed', () => {
    const onEdit = jest.fn()
    render(<ExerciseRow {...defaultProps} onEdit={onEdit} />)

    fireEvent.press(screen.getByLabelText('Editar exercicio'))

    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('shows APAGAR button', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('APAGAR')).toBeTruthy()
  })

  it('shows confirmation when APAGAR is pressed', () => {
    render(<ExerciseRow {...defaultProps} />)

    fireEvent.press(screen.getByText('APAGAR'))

    expect(screen.getByText('CONFIRMAR')).toBeTruthy()
    expect(screen.getByText('CANCELAR')).toBeTruthy()
  })

  it('calls onDelete when CONFIRMAR is pressed', () => {
    const onDelete = jest.fn()
    render(<ExerciseRow {...defaultProps} onDelete={onDelete} />)

    fireEvent.press(screen.getByText('APAGAR'))
    fireEvent.press(screen.getByText('CONFIRMAR'))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('hides confirmation when CANCELAR is pressed', () => {
    render(<ExerciseRow {...defaultProps} />)

    fireEvent.press(screen.getByText('APAGAR'))
    expect(screen.getByText('CONFIRMAR')).toBeTruthy()

    fireEvent.press(screen.getByText('CANCELAR'))

    expect(screen.getByText('APAGAR')).toBeTruthy()
  })

  it('renders equipment info', () => {
    render(<ExerciseRow {...defaultProps} />)

    expect(screen.getByText('Maquina')).toBeTruthy()
  })
})
