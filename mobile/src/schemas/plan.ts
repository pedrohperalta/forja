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

/** Zod schema for exercise form input validation. */
export const ExerciseFormSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  category: z.string().min(1, 'Categoria e obrigatoria'),
  equipment: z.string(),
  reps: z.string(),
  sets: z.number().min(1, 'Minimo 1 serie'),
  restSeconds: z.number().min(0, 'Descanso invalido'),
})

/** Zod schema for a workout plan. */
export const PlanSchema = z.object({
  id: z.string(),
  label: z.string(),
  name: z.string(),
  focus: z.string(),
  exercises: z.array(ExerciseSchema),
  archived: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
