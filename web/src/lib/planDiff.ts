import type { Plan } from '@forja/domain'

export type PlanDiffEntry =
  | { kind: 'plan-field'; field: PlanDiffFieldLabel; from: string; to: string }
  | { kind: 'exercise-added'; exerciseName: string }
  | { kind: 'exercise-removed'; exerciseName: string }
  | {
      kind: 'exercise-field'
      exerciseName: string
      field: ExerciseDiffFieldLabel
      from: string
      to: string
    }

type PlanDiffFieldLabel = 'Nome' | 'Foco' | 'Rótulo'
type ExerciseDiffFieldLabel =
  | 'Nome'
  | 'Categoria'
  | 'Equipamento'
  | 'Repetições'
  | 'Séries'
  | 'Descanso'

const PLAN_FIELD_LABELS = {
  name: 'Nome',
  focus: 'Foco',
  label: 'Rótulo',
} as const satisfies Record<string, PlanDiffFieldLabel>

const EXERCISE_FIELD_LABELS = {
  name: 'Nome',
  category: 'Categoria',
  equipment: 'Equipamento',
  reps: 'Repetições',
  sets: 'Séries',
  restSeconds: 'Descanso',
} as const satisfies Record<string, ExerciseDiffFieldLabel>

type PlanFieldKey = keyof typeof PLAN_FIELD_LABELS
type ExerciseFieldKey = keyof typeof EXERCISE_FIELD_LABELS

export function diffPlans(draft: Plan, revision: Plan): PlanDiffEntry[] {
  const entries: PlanDiffEntry[] = []

  for (const key of Object.keys(PLAN_FIELD_LABELS) as PlanFieldKey[]) {
    const before = revision[key]
    const after = draft[key]

    if (before !== after) {
      entries.push({
        kind: 'plan-field',
        field: PLAN_FIELD_LABELS[key],
        from: before,
        to: after,
      })
    }
  }

  const revisionExercises = new Map(revision.exercises.map((exercise) => [exercise.id, exercise]))
  const draftExercises = new Map(draft.exercises.map((exercise) => [exercise.id, exercise]))

  for (const exercise of revision.exercises) {
    if (!draftExercises.has(exercise.id)) {
      entries.push({ kind: 'exercise-removed', exerciseName: exercise.name })
    }
  }

  for (const exercise of draft.exercises) {
    const before = revisionExercises.get(exercise.id)

    if (!before) {
      entries.push({ kind: 'exercise-added', exerciseName: exercise.name })
      continue
    }

    for (const key of Object.keys(EXERCISE_FIELD_LABELS) as ExerciseFieldKey[]) {
      const beforeValue = before[key]
      const afterValue = exercise[key]

      if (beforeValue !== afterValue) {
        entries.push({
          kind: 'exercise-field',
          exerciseName: exercise.name,
          field: EXERCISE_FIELD_LABELS[key],
          from: formatValue(key, beforeValue),
          to: formatValue(key, afterValue),
        })
      }
    }
  }

  return entries
}

function formatValue(key: ExerciseFieldKey, value: string | number): string {
  if (key === 'restSeconds' && typeof value === 'number') {
    return `${value}s`
  }

  return String(value)
}

export function describePlanDiffEntry(entry: PlanDiffEntry): string {
  if (entry.kind === 'exercise-added') {
    return `Adicionado: ${entry.exerciseName}`
  }

  if (entry.kind === 'exercise-removed') {
    return `Removido: ${entry.exerciseName}`
  }

  if (entry.kind === 'plan-field') {
    return `${entry.field}: "${entry.from}" → "${entry.to}"`
  }

  return `${entry.exerciseName} · ${entry.field}: "${entry.from}" → "${entry.to}"`
}
