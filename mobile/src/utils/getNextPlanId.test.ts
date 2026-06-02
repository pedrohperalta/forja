/**
 * getNextPlanId utility tests — updated for new signature.
 *
 * Tests the PROXIMO chip logic: oldest date gets priority,
 * undefined (never done) beats any date, tie-break by array order.
 */

import { getNextPlanId } from '@/utils/getNextPlanId'
import { makePlan } from '@/test-utils/factories'
import type { PlanId } from '@/types'

const planA = makePlan({ id: 'A' as PlanId, label: 'A', name: 'Treino A' })
const planB = makePlan({ id: 'B' as PlanId, label: 'B', name: 'Treino B' })
const planC = makePlan({ id: 'C' as PlanId, label: 'C', name: 'Treino C' })
const plans = [planA, planB, planC]

describe('getNextPlanId', () => {
  it('returns plan with oldest lastDate', () => {
    const lastDates = {
      A: '2026-03-20',
      B: '2026-03-21',
      C: '2026-03-19',
    }

    expect(getNextPlanId(plans, lastDates)).toBe('C')
  })

  it('returns plan with undefined lastDate (never done) over any date', () => {
    const lastDates = {
      A: '2026-03-20',
      // B is undefined
      C: '2026-03-19',
    }

    expect(getNextPlanId(plans, lastDates)).toBe('B')
  })

  it('tie-breaks by array order when all undefined', () => {
    expect(getNextPlanId(plans, {})).toBe('A')
  })

  it('tie-breaks by array order when multiple undefined', () => {
    const lastDates = {
      C: '2026-03-20',
      // A and B undefined
    }

    expect(getNextPlanId(plans, lastDates)).toBe('A')
  })

  it('returns first plan when all have the same date (stable sort)', () => {
    const lastDates = {
      A: '2026-03-20',
      B: '2026-03-20',
      C: '2026-03-20',
    }

    expect(getNextPlanId(plans, lastDates)).toBe('A')
  })

  it('handles single plan with date — returns undefined plans first', () => {
    const lastDates = {
      A: '2026-03-20',
    }

    // B and C undefined, so B comes first (after A which has a date)
    expect(getNextPlanId(plans, lastDates)).toBe('B')
  })

  it('works with UUID-based plan IDs', () => {
    const uuidPlanA = makePlan({ id: 'uuid-abc-123' as PlanId, label: 'A' })
    const uuidPlanB = makePlan({ id: 'uuid-def-456' as PlanId, label: 'B' })
    const uuidPlans = [uuidPlanA, uuidPlanB]

    const lastDates = {
      'uuid-abc-123': '2026-03-20',
    }

    expect(getNextPlanId(uuidPlans, lastDates)).toBe('uuid-def-456')
  })

  it('ignores lastDates entries for plans not in the array', () => {
    const lastDates = {
      A: '2026-03-20',
      B: '2026-03-21',
      C: '2026-03-19',
      D: '2026-01-01', // D not in plans array — should be ignored
    }

    expect(getNextPlanId(plans, lastDates)).toBe('C')
  })
})
