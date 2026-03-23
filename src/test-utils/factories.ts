import type { Exercise, ExerciseId, ExerciseLog, Plan, PlanId } from '@/types'

const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00.000Z'

/** Creates a test Exercise with all required fields. */
export function makeExercise(
  id: string,
  overrides: Partial<Omit<Exercise, 'id'>> = {},
): Exercise {
  return {
    id: id as ExerciseId,
    name: overrides.name ?? `Exercise ${id}`,
    category: 'Peito',
    equipment: 'Maquina',
    reps: '10-15',
    sets: 3,
    restSeconds: 60,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  }
}

/** Creates a test Plan with all required fields. */
export function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'A' as PlanId,
    label: 'A',
    name: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    exercises: [makeExercise('ex-1'), makeExercise('ex-2'), makeExercise('ex-3')],
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  }
}

/** Creates a test ExerciseLog entry. */
export function makeLog(
  exerciseId: string,
  name: string,
  sets: { weight: number; completedAt: number }[],
): ExerciseLog {
  return {
    exerciseId: exerciseId as ExerciseId,
    name,
    sets,
  }
}
