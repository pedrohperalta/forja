import type { Exercise, ExerciseId } from '@/types'

/**
 * Returns the first non-skipped exercise from the queue.
 * This is THE canonical way to find the current exercise.
 * Never use queue[0] directly.
 */
export function getCurrentExercise(
  queue: Exercise[],
  skippedIds: ExerciseId[],
): Exercise | undefined {
  return queue.find((e) => !skippedIds.includes(e.id))
}
