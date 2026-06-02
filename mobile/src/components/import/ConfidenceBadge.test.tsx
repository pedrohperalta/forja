/**
 * ConfidenceBadge component tests
 *
 * Tests color thresholds (green >= 0.8, yellow >= 0.5, red < 0.5)
 * and percentage text display.
 */

import { render, screen } from '@testing-library/react-native'
import { ConfidenceBadge } from '@/components/import/ConfidenceBadge'

describe('ConfidenceBadge', () => {
  it('displays percentage text for high confidence', () => {
    render(<ConfidenceBadge confidence={0.95} />)

    expect(screen.getByText('95%')).toBeTruthy()
  })

  it('displays percentage text for medium confidence', () => {
    render(<ConfidenceBadge confidence={0.65} />)

    expect(screen.getByText('65%')).toBeTruthy()
  })

  it('displays percentage text for low confidence', () => {
    render(<ConfidenceBadge confidence={0.3} />)

    expect(screen.getByText('30%')).toBeTruthy()
  })

  it('rounds percentage correctly', () => {
    render(<ConfidenceBadge confidence={0.876} />)

    expect(screen.getByText('88%')).toBeTruthy()
  })

  it('renders green style for confidence >= 0.8', () => {
    render(<ConfidenceBadge confidence={0.85} />)

    const badge = screen.getByLabelText('Confianca 85%')
    expect(badge.props.className).toContain('bg-accent-dim')
  })

  it('renders yellow style for confidence >= 0.5 and < 0.8', () => {
    render(<ConfidenceBadge confidence={0.6} />)

    const badge = screen.getByLabelText('Confianca 60%')
    expect(badge.props.className).toContain('bg-warning-dim')
  })

  it('renders red style for confidence < 0.5', () => {
    render(<ConfidenceBadge confidence={0.3} />)

    const badge = screen.getByLabelText('Confianca 30%')
    expect(badge.props.className).toContain('bg-danger-dim')
  })

  it('renders green at exact 0.8 boundary', () => {
    render(<ConfidenceBadge confidence={0.8} />)

    const badge = screen.getByLabelText('Confianca 80%')
    expect(badge.props.className).toContain('bg-accent-dim')
  })

  it('renders yellow at exact 0.5 boundary', () => {
    render(<ConfidenceBadge confidence={0.5} />)

    const badge = screen.getByLabelText('Confianca 50%')
    expect(badge.props.className).toContain('bg-warning-dim')
  })
})
