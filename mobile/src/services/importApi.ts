import { ExtractWorkoutResponseSchema } from '@/schemas/import'
import { MUSCLE_CATEGORIES } from '@/constants/categories'
import type { ExtractedWorkout } from '@/types'

const DISABLED_IMPORT_MESSAGE = 'Importação por IA está disponível apenas no admin web.'

const CATEGORY_MAP: Record<string, string> = {
  Chest: 'Peito',
  Back: 'Costas',
  Shoulders: 'Ombros',
  Biceps: 'Bíceps',
  Triceps: 'Tríceps',
  Forearm: 'Antebraço',
  Abs: 'Abdômen',
  Quads: 'Quadríceps',
  Hamstrings: 'Posterior',
  Glutes: 'Glúteos',
  Calves: 'Panturrilha',
  'Full Body': 'Corpo Inteiro',
  Antebraco: 'Antebraço',
  Abdomen: 'Abdômen',
  Quadriceps: 'Quadríceps',
  Gluteos: 'Glúteos',
}

const VALID_CATEGORIES = new Set<string>(MUSCLE_CATEGORIES)

export async function extractWorkout(
  _imageUri: string,
  _label: string,
): Promise<ExtractedWorkout> {
  throw new Error(DISABLED_IMPORT_MESSAGE)
}

export function normalizeExtractedWorkout(response: unknown): ExtractedWorkout {
  if (isImportResponseCandidate(response)) {
    for (const exercise of response.workout.exercises) {
      exercise.category = normalizeCategory(exercise.category)
    }
  }

  const parsed = ExtractWorkoutResponseSchema.parse(response)
  return parsed.workout
}

function normalizeCategory(category: string): string {
  if (VALID_CATEGORIES.has(category)) {
    return category
  }

  return CATEGORY_MAP[category] ?? 'Corpo Inteiro'
}

function isImportResponseCandidate(
  response: unknown,
): response is { workout: { exercises: { category: string }[] } } {
  if (typeof response !== 'object' || response === null || !('workout' in response)) {
    return false
  }

  const workout = response.workout
  if (
    typeof workout !== 'object' ||
    workout === null ||
    !('exercises' in workout) ||
    !Array.isArray(workout.exercises)
  ) {
    return false
  }

  return workout.exercises.every(
    (exercise) =>
      typeof exercise === 'object' &&
      exercise !== null &&
      'category' in exercise &&
      typeof exercise.category === 'string',
  )
}
