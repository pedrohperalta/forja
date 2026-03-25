import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import * as Crypto from 'expo-crypto'
import type { Exercise, ExerciseId, ExtractedWorkout, Plan, PlanId } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'
import { useWorkoutStore } from '@/stores/workoutStore'

/** Increments a label string: A->B, Z->AA, AA->AB, AZ->BA, etc. */
export function incrementLabel(label: string): string {
  const chars = label.split('')
  let carry = true

  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    const char = chars[i]!
    if (char === 'Z') {
      chars[i] = 'A'
    } else {
      chars[i] = String.fromCharCode(char.charCodeAt(0) + 1)
      carry = false
    }
  }

  if (carry) {
    chars.unshift('A')
  }

  return chars.join('')
}

/** Return value from importPlans — contains skippedPlanId if active workout guard fired. */
export type ImportPlansResult = { skippedPlanId?: PlanId }

/** Plan store state with CRUD operations. */
export interface PlanState {
  plans: Plan[]
  nextLabel: string
  addPlan: (name: string, focus: string) => PlanId
  updatePlan: (id: PlanId, changes: Partial<Pick<Plan, 'name' | 'focus'>>) => void
  removePlan: (id: PlanId) => void
  archiveAllPlans: () => void
  importPlans: (workouts: ExtractedWorkout[], mode: 'replace' | 'add') => ImportPlansResult
  addExercise: (
    planId: PlanId,
    exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>,
    exerciseId?: ExerciseId,
  ) => ExerciseId
  updateExercise: (
    planId: PlanId,
    exerciseId: ExerciseId,
    changes: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
  ) => void
  removeExercise: (planId: PlanId, exerciseId: ExerciseId) => void
  reorderExercises: (planId: PlanId, orderedIds: ExerciseId[]) => void
  reset: () => void
}

export const usePlanStore = create<PlanState>()(
  persist(
    devtools((set, get) => ({
      plans: [],
      nextLabel: 'A',

      addPlan: (name: string, focus: string): PlanId => {
        const now = new Date().toISOString()
        const id = Crypto.randomUUID() as PlanId
        const label = get().nextLabel

        const newPlan: Plan = {
          id,
          label,
          name,
          focus,
          exercises: [],
          createdAt: now,
          updatedAt: now,
        }

        set({
          plans: [...get().plans, newPlan],
          nextLabel: incrementLabel(label),
        })

        return id
      },

      updatePlan: (id: PlanId, changes: Partial<Pick<Plan, 'name' | 'focus'>>): void => {
        const now = new Date().toISOString()
        set({
          plans: get().plans.map((plan) =>
            plan.id === id ? { ...plan, ...changes, updatedAt: now } : plan,
          ),
        })
      },

      removePlan: (id: PlanId): void => {
        const workoutState = useWorkoutStore.getState()
        if (workoutState.activePlan?.id === id && workoutState.status === 'active') {
          return
        }

        set({
          plans: get().plans.filter((plan) => plan.id !== id),
        })
      },

      archiveAllPlans: (): void => {
        set({
          plans: get().plans.map((plan) =>
            plan.archived !== true ? { ...plan, archived: true } : plan,
          ),
        })
      },

      importPlans: (workouts: ExtractedWorkout[], mode: 'replace' | 'add'): ImportPlansResult => {
        const now = new Date().toISOString()
        const currentPlans = get().plans
        let label = get().nextLabel
        let skippedPlanId: PlanId | undefined

        // Archive existing plans in replace mode
        let updatedPlans = currentPlans
        if (mode === 'replace') {
          const workoutState = useWorkoutStore.getState()
          const activePlanId =
            workoutState.status === 'active' ? workoutState.activePlan?.id : undefined

          updatedPlans = currentPlans.map((plan) => {
            if (plan.archived === true) return plan
            if (activePlanId && plan.id === activePlanId) {
              skippedPlanId = plan.id as PlanId
              return plan
            }
            return { ...plan, archived: true }
          })
        }

        // Convert extracted workouts to plans
        const newPlans: Plan[] = workouts.map((workout) => {
          const planId = Crypto.randomUUID() as PlanId
          const planLabel = label
          label = incrementLabel(label)

          // Derive focus from unique exercise categories
          const uniqueCategories: string[] = []
          for (const ex of workout.exercises) {
            if (!uniqueCategories.includes(ex.category)) {
              uniqueCategories.push(ex.category)
            }
          }
          const focus = uniqueCategories.join(' / ')

          // Convert exercises, stripping confidence
          const exercises: Exercise[] = workout.exercises.map((ex) => ({
            id: Crypto.randomUUID() as ExerciseId,
            name: ex.name,
            category: ex.category,
            equipment: ex.equipment,
            reps: ex.reps,
            sets: ex.sets,
            restSeconds: ex.restSeconds,
            createdAt: now,
            updatedAt: now,
          }))

          return {
            id: planId,
            label: planLabel,
            name: workout.name,
            focus,
            exercises,
            createdAt: now,
            updatedAt: now,
          }
        })

        // Single atomic set()
        set({
          plans: [...updatedPlans, ...newPlans],
          nextLabel: label,
        })

        return skippedPlanId ? { skippedPlanId } : {}
      },

      addExercise: (
        planId: PlanId,
        exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>,
        exerciseId?: ExerciseId,
      ): ExerciseId => {
        const now = new Date().toISOString()
        const newExercise: Exercise = {
          ...exercise,
          id: exerciseId ?? (Crypto.randomUUID() as ExerciseId),
          createdAt: now,
          updatedAt: now,
        }

        set({
          plans: get().plans.map((plan) =>
            plan.id === planId
              ? { ...plan, exercises: [...plan.exercises, newExercise], updatedAt: now }
              : plan,
          ),
        })

        return newExercise.id
      },

      updateExercise: (
        planId: PlanId,
        exerciseId: ExerciseId,
        changes: Partial<Omit<Exercise, 'id' | 'createdAt'>>,
      ): void => {
        const now = new Date().toISOString()
        set({
          plans: get().plans.map((plan) =>
            plan.id === planId
              ? {
                  ...plan,
                  exercises: plan.exercises.map((ex) =>
                    ex.id === exerciseId ? { ...ex, ...changes, updatedAt: now } : ex,
                  ),
                  updatedAt: now,
                }
              : plan,
          ),
        })
      },

      removeExercise: (planId: PlanId, exerciseId: ExerciseId): void => {
        const now = new Date().toISOString()
        set({
          plans: get().plans.map((plan) =>
            plan.id === planId
              ? {
                  ...plan,
                  exercises: plan.exercises.filter((ex) => ex.id !== exerciseId),
                  updatedAt: now,
                }
              : plan,
          ),
        })
      },

      reorderExercises: (planId: PlanId, orderedIds: ExerciseId[]): void => {
        const now = new Date().toISOString()
        set({
          plans: get().plans.map((plan) => {
            if (plan.id !== planId) return plan

            const exerciseMap = new Map(plan.exercises.map((ex) => [ex.id, ex]))
            const reordered = orderedIds
              .map((id) => exerciseMap.get(id))
              .filter((ex): ex is Exercise => ex !== undefined)

            return { ...plan, exercises: reordered, updatedAt: now }
          }),
        })
      },

      reset: (): void => {
        set({
          plans: [],
          nextLabel: 'A',
        })
      },
    })),
    {
      name: 'plan-store',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 2,
      migrate: (state, version) => {
        const s = state as PlanState
        // v1 → v2: backfill archived: false on all plans
        if (version === 1) {
          return {
            ...s,
            plans: s.plans.map((plan) => ({
              ...plan,
              archived: plan.archived ?? false,
            })),
          } as PlanState
        }
        return s
      },
      partialize: (state) => ({
        plans: state.plans,
        nextLabel: state.nextLabel,
      }),
    },
  ),
)
