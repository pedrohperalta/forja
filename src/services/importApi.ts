import { readAsStringAsync } from 'expo-file-system'
import { ExtractWorkoutResponseSchema } from '@/schemas/import'
import { MUSCLE_CATEGORIES } from '@/constants/categories'
import type { ExtractedWorkout } from '@/types'

/** Maps English and accent-stripped category names to MUSCLE_CATEGORIES entries. */
const CATEGORY_MAP: Record<string, string> = {
  // English → Portuguese
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
  // Accent-stripped variants
  Antebraco: 'Antebraço',
  Abdomen: 'Abdômen',
  Quadriceps: 'Quadríceps',
  Gluteos: 'Glúteos',
}

/** Valid categories set for fast lookup. */
const VALID_CATEGORIES = new Set<string>(MUSCLE_CATEGORIES)

/** Normalizes a category string to a valid MUSCLE_CATEGORIES entry. */
function normalizeCategory(category: string): string {
  if (VALID_CATEGORIES.has(category)) return category
  const mapped = CATEGORY_MAP[category]
  if (mapped) return mapped
  return 'Corpo Inteiro'
}

/**
 * Calls the Supabase Edge Function to extract a workout from a photo.
 *
 * Reads the image URI as base64, sends it to the edge function,
 * normalizes categories, and validates the response with Zod.
 */
export async function extractWorkout(imageUri: string, label: string): Promise<ExtractedWorkout> {
  const base64 = await readAsStringAsync(imageUri, {
    encoding: 'base64',
  })

  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/extract-workout`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ image: base64, label }),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    throw new Error(errorBody.error ?? `HTTP ${response.status}`)
  }

  const json = await response.json()

  // Normalize categories before Zod validation
  if (json.workout?.exercises) {
    for (const exercise of json.workout.exercises) {
      exercise.category = normalizeCategory(exercise.category)
    }
  }

  const parsed = ExtractWorkoutResponseSchema.parse(json)
  return parsed.workout
}
