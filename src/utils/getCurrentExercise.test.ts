import { getCurrentExercise } from '@/utils/getCurrentExercise'
import type { ExerciseId } from '@/types'
import { makeExercise } from '@/test-utils/factories'

describe('getCurrentExercise', () => {
  it('returns the first exercise when no exercises are skipped', () => {
    const queue = [makeExercise('a'), makeExercise('b'), makeExercise('c')]
    const result = getCurrentExercise(queue, [])
    expect(result).toEqual(queue[0])
  })

  it('skips exercises whose IDs are in the skipped list', () => {
    const queue = [makeExercise('a'), makeExercise('b'), makeExercise('c')]
    const skipped = ['a' as ExerciseId]
    const result = getCurrentExercise(queue, skipped)
    expect(result).toEqual(queue[1])
  })

  it('returns undefined when all exercises are skipped', () => {
    const queue = [makeExercise('a'), makeExercise('b')]
    const skipped = ['a' as ExerciseId, 'b' as ExerciseId]
    const result = getCurrentExercise(queue, skipped)
    expect(result).toBeUndefined()
  })

  it('returns undefined for an empty queue', () => {
    const result = getCurrentExercise([], [])
    expect(result).toBeUndefined()
  })

  it('returns the correct exercise when multiple are skipped', () => {
    const queue = [makeExercise('a'), makeExercise('b'), makeExercise('c'), makeExercise('d')]
    const skipped = ['a' as ExerciseId, 'b' as ExerciseId, 'c' as ExerciseId]
    const result = getCurrentExercise(queue, skipped)
    expect(result).toEqual(queue[3])
  })
})
