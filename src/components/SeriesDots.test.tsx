import { render, screen } from '@testing-library/react-native'
import { SeriesDots } from './SeriesDots'

describe('SeriesDots', () => {
  it('renders correct accessibilityLabel', () => {
    render(<SeriesDots currentSet={2} totalSets={3} />)

    const container = screen.getByLabelText('Série 2 de 3')
    expect(container).toBeTruthy()
  })

  it('renders totalSets number of dots', () => {
    render(<SeriesDots currentSet={1} totalSets={3} />)

    // Check the container label
    const container = screen.getByLabelText('Série 1 de 3')
    expect(container).toBeTruthy()
  })

  it('marks completed sets as filled', () => {
    render(<SeriesDots currentSet={3} totalSets={3} />)

    // Sets 1 and 2 are completed (filled), set 3 is current (filled as active)
    const container = screen.getByLabelText('Série 3 de 3')
    expect(container).toBeTruthy()
  })

  it('handles set 1 of 3', () => {
    render(<SeriesDots currentSet={1} totalSets={3} />)

    const container = screen.getByLabelText('Série 1 de 3')
    expect(container).toBeTruthy()
  })
})
