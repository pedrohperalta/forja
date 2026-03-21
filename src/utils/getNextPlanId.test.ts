/**
 * getNextPlanId utility tests — TDD Phase 3
 *
 * Tests the PROXIMO chip logic: oldest date gets priority,
 * undefined (never done) beats any date, tie-break A->B->C.
 */

import type { PlanId } from '@/types'
import { getNextPlanId } from '@/utils/getNextPlanId'

describe('getNextPlanId', () => {
  it('returns plan with oldest lastDate', () => {
    const lastDates = {
      A: '2026-03-20',
      B: '2026-03-21',
      C: '2026-03-19',
    }

    expect(getNextPlanId(lastDates)).toBe('C')
  })

  it('returns plan with undefined lastDate (never done) over any date', () => {
    const lastDates = {
      A: '2026-03-20',
      // B is undefined
      C: '2026-03-19',
    }

    expect(getNextPlanId(lastDates)).toBe('B')
  })

  it('tie-breaks A->B->C when all undefined', () => {
    expect(getNextPlanId({})).toBe('A')
  })

  it('tie-breaks A->B->C when multiple undefined', () => {
    const lastDates = {
      C: '2026-03-20',
      // A and B undefined
    }

    expect(getNextPlanId(lastDates)).toBe('A')
  })

  it('returns A when all have the same date (stable sort)', () => {
    const lastDates = {
      A: '2026-03-20',
      B: '2026-03-20',
      C: '2026-03-20',
    }

    expect(getNextPlanId(lastDates)).toBe('A')
  })

  it('handles single plan with date', () => {
    const lastDates = {
      A: '2026-03-20',
    }

    // B and C undefined, so B comes first (after A undefined, which has a date)
    expect(getNextPlanId(lastDates)).toBe('B')
  })
})
