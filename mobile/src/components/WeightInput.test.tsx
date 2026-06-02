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

  describe('stepper buttons — tap (±1)', () => {
    it('increments weight by 1 on quick tap', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')
      fireEvent(button, 'pressOut')

      expect(onChange).toHaveBeenCalledWith('61')
    })

    it('decrements weight by 1 on quick tap', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Diminuir peso')
      fireEvent(button, 'pressIn')
      fireEvent(button, 'pressOut')

      expect(onChange).toHaveBeenCalledWith('59')
    })

    it('does not go below 0', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="0" onChange={onChange} />)

      const button = screen.getByLabelText('Diminuir peso')
      fireEvent(button, 'pressIn')
      fireEvent(button, 'pressOut')

      expect(onChange).toHaveBeenCalledWith('0')
    })

    it('starts from 0 when input is empty', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')
      fireEvent(button, 'pressOut')

      expect(onChange).toHaveBeenCalledWith('1')
    })
  })

  describe('stepper buttons — hold to repeat (±5)', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('fires first ±5 step after hold delay', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')
      jest.advanceTimersByTime(300)

      expect(onChange).toHaveBeenCalledWith('65')
    })

    it('repeats ±5 while held down', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')

      // After hold delay → first +5 (65)
      jest.advanceTimersByTime(300)
      expect(onChange).toHaveBeenLastCalledWith('65')

      // After one repeat interval → +5 again (70)
      jest.advanceTimersByTime(100)
      expect(onChange).toHaveBeenLastCalledWith('70')

      // After another interval → +5 again (75)
      jest.advanceTimersByTime(100)
      expect(onChange).toHaveBeenLastCalledWith('75')

      expect(onChange).toHaveBeenCalledTimes(3)
    })

    it('stops repeating on release', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')
      jest.advanceTimersByTime(300) // first hold step
      jest.advanceTimersByTime(100) // one repeat

      fireEvent(button, 'pressOut')
      jest.advanceTimersByTime(500) // nothing more should fire

      expect(onChange).toHaveBeenCalledTimes(2)
    })

    it('does not fire tap on release after hold', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="60" onChange={onChange} />)

      const button = screen.getByLabelText('Aumentar peso')
      fireEvent(button, 'pressIn')
      jest.advanceTimersByTime(300) // hold kicks in

      fireEvent(button, 'pressOut')

      // Only the hold step, no extra tap
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('65')
    })

    it('floors at 0 when decrementing with hold', () => {
      const onChange = jest.fn()
      render(<WeightInput {...defaultProps} value="3" onChange={onChange} />)

      const button = screen.getByLabelText('Diminuir peso')
      fireEvent(button, 'pressIn')
      jest.advanceTimersByTime(300)

      expect(onChange).toHaveBeenCalledWith('0')
    })
  })
})
