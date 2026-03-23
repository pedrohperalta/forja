import type { ExerciseId, ExerciseLog, WorkoutId } from '@/types'
import { buildWorkoutSession } from '@/utils/buildWorkoutSession'
import { makeExercise, makePlan, makeLog as makeLogEntry } from '@/test-utils/factories'

function makeTestPlan() {
  return makePlan({
    exercises: [makeExercise('supino-reto', { name: 'Supino Reto' })],
  })
}

function makeTestLog(): ExerciseLog[] {
  return [
    makeLogEntry('supino-reto', 'Supino Reto', [
      { weight: 50, completedAt: 1000 },
      { weight: 55, completedAt: 2000 },
      { weight: 60, completedAt: 3000 },
    ]),
    makeLogEntry('elevacao-frontal', 'Elevacao Frontal', [
      { weight: 10, completedAt: 4000 },
      { weight: 12, completedAt: 5000 },
    ]),
  ]
}

describe('buildWorkoutSession', () => {
  const plan = makeTestPlan()
  const log = makeTestLog()
  const startedAt = 1711000000000 // 2024-03-21T...
  const completedAt = 1711002700000 // 45 minutes later

  it('produces a deterministic ID as ${planId}-${startedAt}', () => {
    const session = buildWorkoutSession(plan, log, startedAt, completedAt)

    expect(session.id).toBe(`A-${startedAt}` as WorkoutId)
  })

  it('calculates duration using completedAt (not Date.now())', () => {
    const session = buildWorkoutSession(plan, log, startedAt, completedAt)

    const expectedMinutes = Math.round((completedAt - startedAt) / 60000)
    expect(session.durationMinutes).toBe(expectedMinutes)
  })

  it('uses local date (not UTC) formatted as YYYY-MM-DD', () => {
    const session = buildWorkoutSession(plan, log, startedAt, completedAt)

    // The expected date depends on the local timezone
    const expectedDate = new Date(startedAt).toLocaleDateString('en-CA')
    expect(session.date).toBe(expectedDate)
  })

  it('extracts weight per exercise from the last set', () => {
    const session = buildWorkoutSession(plan, log, startedAt, completedAt)

    // First exercise: last set weight is 60
    expect(session.exercises[0]?.weight).toBe(60)
    // Second exercise: last set weight is 12
    expect(session.exercises[1]?.weight).toBe(12)
  })

  it('builds a complete WorkoutSession with all fields', () => {
    const session = buildWorkoutSession(plan, log, startedAt, completedAt)

    expect(session.planId).toBe('A')
    expect(session.planName).toBe('Treino A')
    expect(session.focus).toBe('Peito / Ombros / Triceps')
    expect(session.exercises).toHaveLength(2)
    expect(session.exercises[0]?.name).toBe('Supino Reto')
    expect(session.exercises[0]?.sets).toBe(3)
    expect(session.exercises[1]?.name).toBe('Elevacao Frontal')
    expect(session.exercises[1]?.sets).toBe(2)
    expect(session.syncStatus).toBe('local')
    expect(session.version).toBe(1)
    expect(session.createdAt).toBeDefined()
    expect(session.updatedAt).toBeDefined()
  })

  it('handles exercise with empty sets array gracefully', () => {
    const emptyLog: ExerciseLog[] = [
      {
        exerciseId: 'supino-reto' as ExerciseId,
        name: 'Supino Reto',
        sets: [],
      },
    ]
    const session = buildWorkoutSession(plan, emptyLog, startedAt, completedAt)

    // Weight defaults to 0 when no sets exist
    expect(session.exercises[0]?.weight).toBe(0)
  })
})
