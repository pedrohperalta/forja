import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import * as Crypto from 'expo-crypto'
import type { Exercise, ExerciseId, Plan, PlanId } from '@/types'
import { mmkvStateStorage } from '@/storage/mmkv'
import { useWorkoutStore } from '@/stores/workoutStore'

/** Increments a label string: A->B, Z->AA, AA->AB, AZ->BA, etc. */
function incrementLabel(label: string): string {
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

/** Plan store state with CRUD operations. */
export interface PlanState {
  plans: Plan[]
  nextLabel: string
  addPlan: (name: string, focus: string) => PlanId
  updatePlan: (id: PlanId, changes: Partial<Pick<Plan, 'name' | 'focus'>>) => void
  removePlan: (id: PlanId) => void
  addExercise: (planId: PlanId, exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => void
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

      addExercise: (
        planId: PlanId,
        exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>,
      ): void => {
        const now = new Date().toISOString()
        const newExercise: Exercise = {
          ...exercise,
          id: Crypto.randomUUID() as ExerciseId,
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
      version: 1,
      migrate: (state) => state as PlanState,
      partialize: (state) => ({
        plans: state.plans,
        nextLabel: state.nextLabel,
      }),
    },
  ),
)
