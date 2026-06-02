import type {
  Exercise,
  ExerciseId,
  ExerciseLog,
  ExtractedExercise,
  ExtractedWorkout,
  Plan,
  PlanId,
} from '@/types'

const DEFAULT_TIMESTAMP = '2026-01-01T00:00:00.000Z'

/** Creates a test Exercise with all required fields. */
export function makeExercise(id: string, overrides: Partial<Omit<Exercise, 'id'>> = {}): Exercise {
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
    archived: false,
    createdAt: DEFAULT_TIMESTAMP,
    updatedAt: DEFAULT_TIMESTAMP,
    ...overrides,
  }
}

/** Creates a test ExtractedExercise with all required fields. */
export function makeExtractedExercise(
  overrides: Partial<ExtractedExercise> = {},
): ExtractedExercise {
  return {
    name: 'Supino Reto',
    category: 'Peito',
    sets: 3,
    reps: '10-12',
    restSeconds: 60,
    equipment: 'Barra',
    confidence: 0.95,
    ...overrides,
  }
}

/** Creates a test ExtractedWorkout with all required fields. */
export function makeExtractedWorkout(overrides: Partial<ExtractedWorkout> = {}): ExtractedWorkout {
  return {
    name: 'Treino de Peito',
    exercises: [
      makeExtractedExercise(),
      makeExtractedExercise({ name: 'Crucifixo', category: 'Peito', equipment: 'Halteres' }),
    ],
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
