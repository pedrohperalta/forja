import type {
  CompletedExercise,
  ExerciseLog,
  Plan,
  WorkoutId,
  WorkoutSession,
} from '@/types'

/**
 * Builds a WorkoutSession from workout completion data.
 *
 * - ID is deterministic: `${planId}-${startedAt}` (enables idempotent saves)
 * - Duration uses completedAt (not Date.now()) for crash-resume accuracy
 * - Date uses local timezone (not UTC)
 * - Weight per exercise is the last set's weight
 */
export function buildWorkoutSession(
  activePlan: Plan,
  log: ExerciseLog[],
  startedAt: number,
  completedAt: number,
): WorkoutSession {
  const now = new Date().toISOString()

  const exercises: CompletedExercise[] = log.map((entry) => {
    const lastSet = entry.sets[entry.sets.length - 1]
    return {
      name: entry.name,
      sets: entry.sets.length,
      weight: lastSet?.weight ?? 0,
    }
  })

  return {
    id: `${activePlan.id}-${startedAt}` as WorkoutId,
    planId: activePlan.id,
    planName: activePlan.name,
    focus: activePlan.focus,
    date: new Date(startedAt).toLocaleDateString('en-CA'),
    durationMinutes: Math.round((completedAt - startedAt) / 60000),
    exercises,
    syncStatus: 'local',
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}
