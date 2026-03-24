import { z } from 'zod'
import { MUSCLE_CATEGORIES } from '@/constants/categories'

/** Zod schema for an AI-extracted exercise. */
export const ExtractedExerciseSchema = z.object({
  name: z.string().min(1),
  category: z.enum(MUSCLE_CATEGORIES as unknown as [string, ...string[]]),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1),
  restSeconds: z.number().int().min(0).max(600),
  equipment: z.string(),
  confidence: z.number().min(0).max(1),
})

/** Zod schema for an AI-extracted workout. */
export const ExtractedWorkoutSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(ExtractedExerciseSchema).min(1),
})

/** Zod schema for the edge function response. */
export const ExtractWorkoutResponseSchema = z.object({
  workout: ExtractedWorkoutSchema,
})
