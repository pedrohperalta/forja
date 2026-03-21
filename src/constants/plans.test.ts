import { PLANS } from '@/constants/plans'
import type { ExerciseId, PlanId } from '@/types'

describe('PLANS', () => {
  it('contains exactly 3 plans (A, B, C)', () => {
    const planKeys = Object.keys(PLANS)
    expect(planKeys).toHaveLength(3)
    expect(planKeys).toEqual(expect.arrayContaining(['A', 'B', 'C']))
  })

  it('each plan has 7 exercises', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.exercises).toHaveLength(7)
    }
  })

  it('every exercise has all required fields', () => {
    for (const plan of Object.values(PLANS)) {
      for (const exercise of plan.exercises) {
        expect(exercise.id).toBeTruthy()
        expect(exercise.name).toBeTruthy()
        expect(exercise.category).toBeTruthy()
        expect(exercise.equipment).toBeTruthy()
        expect(exercise.reps).toBeTruthy()
        expect(exercise.sets).toBeGreaterThan(0)
      }
    }
  })

  it('all exercise IDs are unique across all plans', () => {
    const allIds: ExerciseId[] = []
    for (const plan of Object.values(PLANS)) {
      for (const exercise of plan.exercises) {
        allIds.push(exercise.id)
      }
    }
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
    expect(allIds).toHaveLength(21)
  })

  it('all plan IDs are unique', () => {
    const planIds: PlanId[] = Object.values(PLANS).map((p) => p.id)
    const uniqueIds = new Set(planIds)
    expect(uniqueIds.size).toBe(planIds.length)
  })

  it('each plan has a name and focus', () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.name).toBeTruthy()
      expect(plan.focus).toBeTruthy()
      expect(plan.id).toBeTruthy()
    }
  })
})
