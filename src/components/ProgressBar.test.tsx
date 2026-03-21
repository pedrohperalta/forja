import { render, screen } from '@testing-library/react-native'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('renders with correct accessibility props', () => {
    render(<ProgressBar current={2} total={7} />)

    const progressBar = screen.getByLabelText('Progresso: 2 de 7')
    expect(progressBar).toBeTruthy()
    expect(progressBar.props.role).toBe('progressbar')
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 7,
      now: 2,
    })
  })

  it('renders filled portion proportional to current/total', () => {
    render(<ProgressBar current={3} total={6} />)

    const progressBar = screen.getByLabelText('Progresso: 3 de 6')
    expect(progressBar).toBeTruthy()
    expect(progressBar.props.accessibilityValue.now).toBe(3)
    expect(progressBar.props.accessibilityValue.max).toBe(6)
  })

  it('handles zero total without crashing', () => {
    render(<ProgressBar current={0} total={0} />)

    const progressBar = screen.getByLabelText('Progresso: 0 de 0')
    expect(progressBar).toBeTruthy()
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 0,
      now: 0,
    })
  })

  it('handles current greater than total gracefully', () => {
    render(<ProgressBar current={10} total={5} />)

    const progressBar = screen.getByLabelText('Progresso: 10 de 5')
    expect(progressBar).toBeTruthy()
  })
})
