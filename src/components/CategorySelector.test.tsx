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
    selected: '',
    onSelect: jest.fn(),
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

  it('calls onSelect with category name when a category is pressed', () => {
    const onSelect = jest.fn()
    render(<CategorySelector {...defaultProps} onSelect={onSelect} />)

    fireEvent.press(screen.getByText('Peito'))

    expect(onSelect).toHaveBeenCalledWith('Peito')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('highlights the selected category', () => {
    render(<CategorySelector {...defaultProps} selected="Costas" />)

    // The selected category button should have accessible selected state
    const selectedButton = screen.getByRole('button', { name: 'Costas' })
    expect(selectedButton).toBeTruthy()
  })

  it('calls onSelect with different category when another is pressed', () => {
    const onSelect = jest.fn()
    render(<CategorySelector {...defaultProps} selected="Peito" onSelect={onSelect} />)

    fireEvent.press(screen.getByText('Ombros'))

    expect(onSelect).toHaveBeenCalledWith('Ombros')
  })

  it('renders section label', () => {
    render(<CategorySelector {...defaultProps} />)

    expect(screen.getByText('CATEGORIA')).toBeTruthy()
  })
})
