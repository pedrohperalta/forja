import type { ExerciseId, PlanId, WorkoutId } from './ids'

/** A single recorded set within an exercise. */
export type SetRecord = {
  weight: number
  completedAt: number
}

/** An exercise log entry with all recorded sets. */
export type ExerciseLog = {
  exerciseId: ExerciseId
  name: string
  sets: SetRecord[]
}

/** Discriminated union for workout flow navigation targets. */
export type NavigationTarget =
  | { target: 'rest' }
  | { target: 'checkpoint' }
  | { target: 'complete' }
  | { target: 'next' }

/** A single exercise definition within a plan. */
export type Exercise = {
  id: ExerciseId
  name: string
  category: string
  equipment: string
  reps: string
  sets: number
}

/** A workout plan containing a list of exercises. */
export type Plan = {
  id: PlanId
  name: string
  focus: string
  exercises: Exercise[]
}

/** A completed exercise summary for workout history. */
export type CompletedExercise = {
  name: string
  sets: number
  weight: number
}

/** A completed workout session with sync metadata. */
export type WorkoutSession = {
  id: WorkoutId
  planId: PlanId
  planName: string
  focus: string
  date: string
  durationMinutes: number
  exercises: CompletedExercise[]
  syncStatus: 'local' | 'synced' | 'pending'
  version: number
  createdAt: string
  updatedAt: string
}
