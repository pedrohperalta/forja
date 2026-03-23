import { z } from 'zod'

/** Schema for a single recorded set within an exercise. */
export const SetRecordSchema = z.object({
  weight: z.number(),
  completedAt: z.number(),
})

/** Schema for an exercise log entry. */
export const ExerciseLogSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  sets: z.array(SetRecordSchema),
})

/** Schema for a completed exercise summary. */
export const CompletedExerciseSchema = z.object({
  name: z.string(),
  sets: z.number(),
  weight: z.number(),
})

/** Schema for a completed workout session with sync metadata. */
export const WorkoutSessionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planName: z.string(),
  planLabel: z.string().optional(),
  focus: z.string(),
  date: z.string(),
  durationMinutes: z.number(),
  exercises: z.array(CompletedExerciseSchema),
  syncStatus: z.enum(['local', 'synced', 'pending']),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
