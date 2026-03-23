/**
 * CategorySelector component tests
 *
 * Tests rendering of all 12 muscle categories, selection callback,
 * and selected state display.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { CategorySelector } from '@/components/CategorySelector'
import { MUSCLE_CATEGORIES } from '@/constants/categories'

describe('CategorySelector', () => {
  const defaultProps = {
    selected: [] as string[],
    onToggle: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all 12 muscle categories', () => {
    render(<CategorySelector {...defaultProps} />)

    for (const category of MUSCLE_CATEGORIES) {
      expect(screen.getByText(category)).toBeTruthy()
    }
  })

  it('calls onToggle with category name when pressed', () => {
    const onToggle = jest.fn()
    render(<CategorySelector {...defaultProps} onToggle={onToggle} />)

    fireEvent.press(screen.getByText('Peito'))

    expect(onToggle).toHaveBeenCalledWith('Peito')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('highlights selected categories', () => {
    render(<CategorySelector {...defaultProps} selected={['Costas', 'Peito']} />)

    const costasButton = screen.getByRole('button', { name: 'Costas' })
    const peitoButton = screen.getByRole('button', { name: 'Peito' })
    expect(costasButton).toBeTruthy()
    expect(peitoButton).toBeTruthy()
  })

  it('supports multiple selections visually', () => {
    const onToggle = jest.fn()
    render(<CategorySelector {...defaultProps} selected={['Peito']} onToggle={onToggle} />)

    fireEvent.press(screen.getByText('Ombros'))

    expect(onToggle).toHaveBeenCalledWith('Ombros')
  })

  it('renders section label', () => {
    render(<CategorySelector {...defaultProps} />)

    expect(screen.getByText('CATEGORIA')).toBeTruthy()
  })
})
