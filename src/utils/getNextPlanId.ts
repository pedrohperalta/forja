import type { PlanId } from '@/types'

const PLAN_IDS: PlanId[] = ['A' as PlanId, 'B' as PlanId, 'C' as PlanId]

/**
 * Determines which plan should have the PROXIMO chip.
 *
 * Priority: undefined (never done) > oldest date.
 * Tie-break: A -> B -> C order (stable sort preserves original order).
 */
export function getNextPlanId(
  lastDates: Partial<Record<string, string>>,
): PlanId {
  const sorted = [...PLAN_IDS].sort((a, b) => {
    const dateA = lastDates[a]
    const dateB = lastDates[b]
    if (!dateA && !dateB) return 0 // preserve A->B->C order (stable sort)
    if (!dateA) return -1
    if (!dateB) return 1
    return dateA.localeCompare(dateB)
  })

  return sorted[0]!
}
