/**
 * ImportPhotoCard component tests
 *
 * Tests rendering of photo thumbnail, status indicators
 * (pending/processing/done/error), and remove callback.
 */

import { render, screen, fireEvent } from '@testing-library/react-native'
import { ImportPhotoCard } from '@/components/import/ImportPhotoCard'

describe('ImportPhotoCard', () => {
  const defaultProps = {
    uri: 'file:///photo1.jpg',
    status: 'pending' as const,
    onRemove: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders thumbnail image with correct uri', () => {
    render(<ImportPhotoCard {...defaultProps} />)

    const image = screen.getByLabelText('Foto do treino')
    expect(image).toBeTruthy()
    expect(image.props.source).toEqual({ uri: 'file:///photo1.jpg' })
  })

  it('shows pending status indicator', () => {
    render(<ImportPhotoCard {...defaultProps} status="pending" />)

    expect(screen.getByText('PENDENTE')).toBeTruthy()
  })

  it('shows uploading status indicator', () => {
    render(<ImportPhotoCard {...defaultProps} status="uploading" />)

    expect(screen.getByText('ENVIANDO')).toBeTruthy()
  })

  it('shows done status indicator', () => {
    render(<ImportPhotoCard {...defaultProps} status="done" />)

    expect(screen.getByText('PRONTO')).toBeTruthy()
  })

  it('shows error status indicator', () => {
    render(<ImportPhotoCard {...defaultProps} status="error" />)

    expect(screen.getByText('ERRO')).toBeTruthy()
  })

  it('fires onRemove when remove button is pressed', () => {
    const onRemove = jest.fn()
    render(<ImportPhotoCard {...defaultProps} onRemove={onRemove} />)

    fireEvent.press(screen.getByLabelText('Remover foto'))

    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('hides remove button when status is uploading', () => {
    render(<ImportPhotoCard {...defaultProps} status="uploading" />)

    expect(screen.queryByLabelText('Remover foto')).toBeNull()
  })

  it('hides remove button when status is done', () => {
    render(<ImportPhotoCard {...defaultProps} status="done" />)

    expect(screen.queryByLabelText('Remover foto')).toBeNull()
  })
})
