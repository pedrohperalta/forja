/**
 * RestTimer component tests — Phase 4 (TDD)
 *
 * Tests SVG circle rendering, countdown display, and accessibility.
 */

jest.mock('react-native-reanimated', () => {
  const React = require('react')
  const mock = {
    __esModule: true,
    useSharedValue: jest.fn((init: number) => ({ value: init })),
    useAnimatedProps: jest.fn((fn: () => Record<string, unknown>) => fn()),
    withTiming: jest.fn((val: number) => val),
    interpolateColor: jest.fn(() => '#C2F000'),
    Easing: { linear: 'linear' },
    default: {
      createAnimatedComponent: (component: React.ComponentType) => component,
    },
  }
  return mock
})

jest.mock('react-native-svg', () => {
  const React = require('react')
  return {
    Svg: (props: Record<string, unknown>) => React.createElement('View', props),
    Circle: (props: Record<string, unknown>) => React.createElement('View', props),
    default: (props: Record<string, unknown>) => React.createElement('View', props),
  }
})

import { render, screen } from '@testing-library/react-native'
import type { SharedValue } from 'react-native-reanimated'
import { RestTimer } from './RestTimer'

// Helper to create a mock SharedValue that satisfies the type checker
function mockSharedValue(value: number): SharedValue<number> {
  return { value } as SharedValue<number>
}

describe('RestTimer', () => {
  it('renders the countdown text', () => {
    render(<RestTimer secondsLeft={45} progress={mockSharedValue(0.25)} />)

    expect(screen.getByText('45')).toBeTruthy()
  })

  it('renders with timer accessibility role', () => {
    render(<RestTimer secondsLeft={30} progress={mockSharedValue(0.5)} />)

    const timer = screen.getByLabelText('30 segundos restantes')
    expect(timer).toBeTruthy()
  })

  it('displays zero seconds', () => {
    render(<RestTimer secondsLeft={0} progress={mockSharedValue(1)} />)

    expect(screen.getByText('0')).toBeTruthy()
  })

  it('displays large countdown values', () => {
    render(<RestTimer secondsLeft={120} progress={mockSharedValue(0)} />)

    expect(screen.getByText('120')).toBeTruthy()
  })
})
