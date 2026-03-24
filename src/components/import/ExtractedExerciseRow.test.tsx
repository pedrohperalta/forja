/**
 * ExtractedExerciseRow component tests
 *
 * Tests display-only rendering and inline edit mode for extracted exercises.
 * Display mode: name, category, sets x reps, equipment, confidence badge.
 * Edit mode: tapping row enables editable fields, fires onUpdate callback.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
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

  // -- Edit mode tests (Track 3) --

  describe('edit mode', () => {
    const editProps = {
      ...defaultProps,
      editable: true,
      onUpdate: jest.fn(),
    }

    it('enters edit mode when row is tapped', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      expect(screen.getByDisplayValue('Supino Reto')).toBeTruthy()
    })

    it('shows name input in edit mode', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      const input = screen.getByDisplayValue('Supino Reto')
      fireEvent.changeText(input, 'Supino Inclinado')
      fireEvent(input, 'submitEditing')

      expect(editProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Supino Inclinado' }),
      )
    })

    it('shows sets input in edit mode', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      const input = screen.getByDisplayValue('3')
      fireEvent.changeText(input, '4')
      fireEvent(input, 'submitEditing')

      expect(editProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ sets: 4 }),
      )
    })

    it('shows reps input in edit mode', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      const input = screen.getByDisplayValue('10-12')
      fireEvent.changeText(input, '8-10')
      fireEvent(input, 'submitEditing')

      expect(editProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ reps: '8-10' }),
      )
    })

    it('shows equipment input in edit mode', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      const input = screen.getByDisplayValue('Barra')
      fireEvent.changeText(input, 'Halter')
      fireEvent(input, 'submitEditing')

      expect(editProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ equipment: 'Halter' }),
      )
    })

    it('shows category picker with MUSCLE_CATEGORIES', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))

      // Category picker should show current category and list of options
      expect(screen.getByText('Costas')).toBeTruthy()
      expect(screen.getByText('Ombros')).toBeTruthy()
    })

    it('updates category when picker option is selected', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))
      fireEvent.press(screen.getByText('Costas'))

      expect(editProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Costas' }),
      )
    })

    it('does not enter edit mode when editable is false', () => {
      render(<ExtractedExerciseRow {...defaultProps} />)

      // No edit button should be present
      expect(screen.queryByLabelText('Editar exercício')).toBeNull()
    })

    it('exits edit mode when FECHAR is pressed', () => {
      render(<ExtractedExerciseRow {...editProps} />)

      fireEvent.press(screen.getByLabelText('Editar exercício'))
      expect(screen.getByDisplayValue('Supino Reto')).toBeTruthy()

      fireEvent.press(screen.getByText('FECHAR'))

      // Should be back in display mode
      expect(screen.queryByDisplayValue('Supino Reto')).toBeNull()
      expect(screen.getByText('Supino Reto')).toBeTruthy()
    })
  })
})
