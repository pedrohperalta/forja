/** A single exercise extracted from a workout photo by AI. */
export type ExtractedExercise = {
  name: string
  category: string
  sets: number
  reps: string
  restSeconds: number
  equipment: string
  confidence: number
}

/** A workout extracted from a photo by AI. */
export type ExtractedWorkout = {
  name: string
  exercises: ExtractedExercise[]
}

/** Status of a photo in the import flow. */
export type ImportPhotoStatus = {
  uri: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  errorMessage?: string
}
