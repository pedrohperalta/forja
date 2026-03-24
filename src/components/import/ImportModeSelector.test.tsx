/**
 * ImportModeSelector component tests
 *
 * Tests rendering of replace/add mode options, active mode highlighting,
 * and onModeChange callback.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { ImportModeSelector } from '@/components/import/ImportModeSelector'

describe('ImportModeSelector', () => {
  const defaultProps = {
    mode: 'replace' as const,
    onModeChange: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders replace option', () => {
    render(<ImportModeSelector {...defaultProps} />)

    expect(screen.getByText('SUBSTITUIR')).toBeTruthy()
  })

  it('renders add option', () => {
    render(<ImportModeSelector {...defaultProps} />)

    expect(screen.getByText('ADICIONAR')).toBeTruthy()
  })

  it('highlights replace when mode is replace', () => {
    render(<ImportModeSelector {...defaultProps} mode="replace" />)

    const replaceButton = screen.getByLabelText('Substituir planos existentes')
    expect(replaceButton.props.className).toContain('bg-accent')
  })

  it('highlights add when mode is add', () => {
    render(<ImportModeSelector {...defaultProps} mode="add" />)

    const addButton = screen.getByLabelText('Adicionar aos planos')
    expect(addButton.props.className).toContain('bg-accent')
  })

  it('fires onModeChange with replace when replace is pressed', () => {
    const onModeChange = jest.fn()
    render(<ImportModeSelector {...defaultProps} mode="add" onModeChange={onModeChange} />)

    fireEvent.press(screen.getByText('SUBSTITUIR'))

    expect(onModeChange).toHaveBeenCalledWith('replace')
  })

  it('fires onModeChange with add when add is pressed', () => {
    const onModeChange = jest.fn()
    render(<ImportModeSelector {...defaultProps} mode="replace" onModeChange={onModeChange} />)

    fireEvent.press(screen.getByText('ADICIONAR'))

    expect(onModeChange).toHaveBeenCalledWith('add')
  })

  it('renders explanation text for replace mode', () => {
    render(<ImportModeSelector {...defaultProps} mode="replace" />)

    expect(screen.getByText(/arquiva.*planos.*existentes/i)).toBeTruthy()
  })

  it('renders explanation text for add mode', () => {
    render(<ImportModeSelector {...defaultProps} mode="add" />)

    expect(screen.getByText(/mantém.*planos.*existentes/i)).toBeTruthy()
  })
})
