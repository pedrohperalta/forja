import type { Plan, PlanId } from '@/types'

/**
 * Determines which plan should have the PROXIMO chip.
 *
 * Priority: undefined (never done) > oldest date.
 * Tie-break: preserves original array order (stable sort).
 */
export function getNextPlanId(plans: Plan[], lastDates: Partial<Record<string, string>>): PlanId {
  const planIds = plans.map((p) => p.id)

  const sorted = [...planIds].sort((a, b) => {
    const dateA = lastDates[a]
    const dateB = lastDates[b]
    if (!dateA && !dateB) return 0 // preserve array order (stable sort)
    if (!dateA) return -1
    if (!dateB) return 1
    return dateA.localeCompare(dateB)
  })

  return sorted[0]!
}
