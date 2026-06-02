import type { ExerciseId, Plan, WorkoutSession } from '@/types'

/**
 * Reconstructs `lastWeights` (exerciseId → weight) from the user's
 * synced workout history. Matches completed exercises by name because
 * the session payload doesn't carry the plan's exerciseId.
 *
 * Used after sync so devices that lost local state (reinstall) can
 * recover the per-exercise last weight that powers workout prefill.
 */
export function rebuildLastWeights(
  plans: Plan[],
  history: WorkoutSession[],
): Record<ExerciseId, number> {
  const nameToId = new Map<string, ExerciseId>()
  for (const plan of plans) {
    for (const exercise of plan.exercises) {
      if (!nameToId.has(exercise.name)) {
        nameToId.set(exercise.name, exercise.id)
      }
    }
  }

  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))

  const result: Record<ExerciseId, number> = {}
  for (const session of sorted) {
    for (const completed of session.exercises) {
      const id = nameToId.get(completed.name)
      if (!id) continue
      if (result[id] !== undefined) continue
      if (completed.weight <= 0) continue
      result[id] = completed.weight
    }
  }
  return result
}
