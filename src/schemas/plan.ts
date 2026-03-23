import { z } from 'zod'

/** Zod schema for a single exercise definition. */
export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  equipment: z.string(),
  reps: z.string(),
  sets: z.number(),
  restSeconds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Zod schema for a workout plan. */
export const PlanSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  focus: z.string(),
  exercises: z.array(ExerciseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
