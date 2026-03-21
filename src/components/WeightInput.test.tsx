import { render, screen, fireEvent } from '@testing-library/react-native'
import { WeightInput } from './WeightInput'

describe('WeightInput', () => {
  const defaultProps = {
    value: '60',
    onChange: jest.fn(),
    exerciseName: 'Supino Reto',
    setNumber: 1,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with the correct value', () => {
    render(<WeightInput {...defaultProps} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    expect(input.props.value).toBe('60')
  })

  it('has keyboardType decimal-pad', () => {
    render(<WeightInput {...defaultProps} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    expect(input.props.keyboardType).toBe('decimal-pad')
  })

  it('calls onChange with valid numeric input', () => {
    const onChange = jest.fn()
    render(<WeightInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    fireEvent.changeText(input, '75.5')

    expect(onChange).toHaveBeenCalledWith('75.5')
  })

  it('rejects negative values', () => {
    const onChange = jest.fn()
    render(<WeightInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    fireEvent.changeText(input, '-10')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows empty string (user clearing input)', () => {
    const onChange = jest.fn()
    render(<WeightInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    fireEvent.changeText(input, '')

    expect(onChange).toHaveBeenCalledWith('')
  })

  it('rejects non-numeric input', () => {
    const onChange = jest.fn()
    render(<WeightInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    fireEvent.changeText(input, 'abc')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('allows decimal input with one dot', () => {
    const onChange = jest.fn()
    render(<WeightInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 1')
    fireEvent.changeText(input, '12.5')

    expect(onChange).toHaveBeenCalledWith('12.5')
  })

  it('displays correct accessibilityLabel with set number', () => {
    render(<WeightInput {...defaultProps} setNumber={3} />)

    const input = screen.getByLabelText('Peso para Supino Reto, série 3')
    expect(input).toBeTruthy()
  })
})
