import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import type { Exercise, ExerciseId, ExerciseLog, NavigationTarget, Plan, SetRecord } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'
import { getCurrentExercise } from '@/utils/getCurrentExercise'

/** Active workout state with all exercise flow logic. */
export interface WorkoutState {
  status: 'idle' | 'active' | 'completed'
  activePlan: Plan | null
  queue: Exercise[]
  skippedIds: ExerciseId[]
  currentSet: number
  currentSets: SetRecord[]
  log: ExerciseLog[]
  startedAt: number | null
  completedAt: number | null
  startWorkout: (plan: Plan) => void
  completeSet: (weight: number) => NavigationTarget
  skipExercise: () => NavigationTarget
  removeExercise: (exerciseId?: ExerciseId) => NavigationTarget
  returnToSkipped: (id: ExerciseId) => void
  complete: () => void
  reset: () => void
}

/** Compute the navigation target from the current post-mutation state. */
function resolveTarget(queue: Exercise[], skippedIds: ExerciseId[]): NavigationTarget {
  if (queue.length === 0) return { target: 'complete' }
  const current = getCurrentExercise(queue, skippedIds)
  if (!current) return { target: 'checkpoint' }
  return { target: 'next' }
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    devtools((set, get) => ({
      status: 'idle',
      activePlan: null,
      queue: [],
      skippedIds: [],
      currentSet: 1,
      currentSets: [],
      log: [],
      startedAt: null,
      completedAt: null,

      startWorkout: (plan: Plan): void => {
        if (plan.exercises.length === 0) return
        set({
          status: 'active',
          activePlan: plan,
          queue: [...plan.exercises],
          skippedIds: [],
          currentSet: 1,
          currentSets: [],
          log: [],
          startedAt: Date.now(),
          completedAt: null,
        })
      },

      completeSet: (weight: number): NavigationTarget => {
        const state = get()
        const exercise = getCurrentExercise(state.queue, state.skippedIds)
        if (!exercise) return { target: 'complete' }

        const newSetRecord: SetRecord = { weight, completedAt: Date.now() }

        // Not last set — increment currentSet, add to currentSets, return 'rest'
        if (state.currentSet < exercise.sets) {
          set({
            currentSet: state.currentSet + 1,
            currentSets: [...state.currentSets, newSetRecord],
          })
          return { target: 'rest', restSeconds: exercise.restSeconds }
        }

        // Last set — log exercise, remove from queue by ID, reset currentSet/currentSets
        const completedSets = [...state.currentSets, newSetRecord]
        const logEntry: ExerciseLog = {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: completedSets,
        }

        const newQueue = state.queue.filter((e) => e.id !== exercise.id)
        const newLog = [...state.log, logEntry]

        set({
          queue: newQueue,
          log: newLog,
          currentSet: 1,
          currentSets: [],
        })

        // Compute target from POST-MUTATION state
        if (newQueue.length === 0) return { target: 'complete' }
        const nextExercise = getCurrentExercise(newQueue, state.skippedIds)
        if (!nextExercise) return { target: 'checkpoint' }
        return { target: 'rest', restSeconds: exercise.restSeconds }
      },

      skipExercise: (): NavigationTarget => {
        const state = get()
        const exercise = getCurrentExercise(state.queue, state.skippedIds)
        if (!exercise) return { target: 'checkpoint' }

        const newSkippedIds = [...state.skippedIds, exercise.id]

        set({
          skippedIds: newSkippedIds,
          currentSet: 1,
          currentSets: [],
        })

        // Compute target from POST-MUTATION state
        const next = getCurrentExercise(state.queue, newSkippedIds)
        if (!next) return { target: 'checkpoint' }
        return { target: 'next' }
      },

      removeExercise: (exerciseId?: ExerciseId): NavigationTarget => {
        const state = get()
        const currentExercise = getCurrentExercise(state.queue, state.skippedIds)
        const targetId = exerciseId ?? currentExercise?.id
        if (!targetId) return { target: 'complete' }

        const isRemovingCurrent = targetId === currentExercise?.id
        const newQueue = state.queue.filter((e) => e.id !== targetId)
        const newSkippedIds = state.skippedIds.filter((id) => id !== targetId)

        const updates: Partial<WorkoutState> = {
          queue: newQueue,
          skippedIds: newSkippedIds,
        }

        // Reset currentSet/currentSets ONLY if removing the current exercise
        if (isRemovingCurrent) {
          updates.currentSet = 1
          updates.currentSets = []
        }

        set(updates)

        // Compute target from POST-MUTATION state
        return resolveTarget(newQueue, newSkippedIds)
      },

      returnToSkipped: (id: ExerciseId): void => {
        const state = get()
        set({
          skippedIds: state.skippedIds.filter((skippedId) => skippedId !== id),
        })
        // Does NOT reset currentSet/currentSets — preserves in-progress set data
      },

      complete: (): void => {
        set({
          status: 'completed',
          completedAt: Date.now(),
        })
      },

      reset: (): void => {
        set({
          status: 'idle',
          activePlan: null,
          queue: [],
          skippedIds: [],
          currentSet: 1,
          currentSets: [],
          log: [],
          startedAt: null,
          completedAt: null,
        })
      },
    })),
    {
      name: 'workout-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as any

        if (version === 1) {
          const now = new Date().toISOString()

          // Backfill exercise fields helper

          const backfillExercise = (ex: any) => ({
            ...ex,
            restSeconds: ex.restSeconds ?? 60,
            createdAt: ex.createdAt ?? now,
            updatedAt: ex.updatedAt ?? now,
          })

          if (state.activePlan) {
            const namePrefix = state.activePlan.name?.charAt(0) ?? 'X'
            state.activePlan = {
              ...state.activePlan,
              label: state.activePlan.label ?? (namePrefix === ' ' ? 'X' : namePrefix),
              createdAt: state.activePlan.createdAt ?? now,
              updatedAt: state.activePlan.updatedAt ?? now,
              exercises: state.activePlan.exercises?.map(backfillExercise) ?? [],
            }
          }

          if (state.queue?.length) {
            state.queue = state.queue.map(backfillExercise)
          }
        }

        return state as WorkoutState
      },
      partialize: (state) => ({
        status: state.status,
        activePlan: state.activePlan,
        queue: state.queue,
        skippedIds: state.skippedIds,
        currentSet: state.currentSet,
        currentSets: state.currentSets,
        log: state.log,
        startedAt: state.startedAt,
        completedAt: state.completedAt,
      }),
    },
  ),
)
