import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ExtractedExercise, ExtractedWorkout, ImportPhotoStatus, PlanId } from '@/types'
import { usePlanStore } from '@/stores/planStore'

/** Import flow status. */
type ImportStatus = 'idle' | 'capturing' | 'processing' | 'reviewing' | 'confirmed'

/** Ephemeral import store state — no persistence. */
export interface ImportState {
  photos: ImportPhotoStatus[]
  workouts: ExtractedWorkout[]
  mode: 'replace' | 'add'
  status: ImportStatus
  skippedPlanId: PlanId | null
  addPhoto: (uri: string) => void
  removePhoto: (uri: string) => void
  setMode: (mode: 'replace' | 'add') => void
  updatePhotoStatus: (
    uri: string,
    status: ImportPhotoStatus['status'],
    errorMessage?: string,
  ) => void
  setWorkouts: (workouts: ExtractedWorkout[]) => void
  updateExtractedExercise: (
    workoutIndex: number,
    exerciseIndex: number,
    changes: Partial<ExtractedExercise>,
  ) => void
  removeExtractedExercise: (workoutIndex: number, exerciseIndex: number) => void
  setStatus: (status: ImportStatus) => void
  confirmImport: () => void
  reset: () => void
}

const INITIAL_STATE = {
  photos: [] as ImportPhotoStatus[],
  workouts: [] as ExtractedWorkout[],
  mode: 'replace' as const,
  status: 'idle' as ImportStatus,
  skippedPlanId: null as PlanId | null,
}

export const useImportStore = create<ImportState>()(
  devtools((set, get) => ({
    ...INITIAL_STATE,

    addPhoto: (uri: string): void => {
      set({ photos: [...get().photos, { uri, status: 'pending' }] })
    },

    removePhoto: (uri: string): void => {
      set({ photos: get().photos.filter((p) => p.uri !== uri) })
    },

    setMode: (mode: 'replace' | 'add'): void => {
      set({ mode })
    },

    updatePhotoStatus: (
      uri: string,
      status: ImportPhotoStatus['status'],
      errorMessage?: string,
    ): void => {
      set({
        photos: get().photos.map((p) =>
          p.uri === uri
            ? { ...p, status, ...(errorMessage !== undefined ? { errorMessage } : {}) }
            : p,
        ),
      })
    },

    setWorkouts: (workouts: ExtractedWorkout[]): void => {
      set({ workouts })
    },

    updateExtractedExercise: (
      workoutIndex: number,
      exerciseIndex: number,
      changes: Partial<ExtractedExercise>,
    ): void => {
      const workouts = get().workouts.map((workout, wi) => {
        if (wi !== workoutIndex) return workout
        return {
          ...workout,
          exercises: workout.exercises.map((ex, ei) =>
            ei === exerciseIndex ? { ...ex, ...changes } : ex,
          ),
        }
      })
      set({ workouts })
    },

    removeExtractedExercise: (workoutIndex: number, exerciseIndex: number): void => {
      const workouts = get()
        .workouts.map((workout, wi) => {
          if (wi !== workoutIndex) return workout
          return {
            ...workout,
            exercises: workout.exercises.filter((_, ei) => ei !== exerciseIndex),
          }
        })
        .filter((w) => w.exercises.length > 0)
      set({ workouts })
    },

    setStatus: (status: ImportStatus): void => {
      set({ status })
    },

    confirmImport: (): void => {
      const { workouts, mode } = get()
      const result = usePlanStore.getState().importPlans(workouts, mode)
      set({
        status: 'confirmed',
        skippedPlanId: result.skippedPlanId ?? null,
      })
    },

    reset: (): void => {
      set({ ...INITIAL_STATE })
    },
  })),
)
