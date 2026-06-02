/**
 * rebuildLastWeights tests
 *
 * Pure function that reconstructs the per-exercise lastWeights map
 * by matching completed-exercise names from synced sessions back to
 * the current plan exercises' IDs. Used after sync so a reinstalled
 * device recovers weights that were never persisted to the cloud.
 */

import { rebuildLastWeights } from '@/utils/rebuildLastWeights'
import type { Exercise, ExerciseId, Plan, PlanId, WorkoutId, WorkoutSession } from '@/types'

function ex(id: string, name: string): Exercise {
  return {
    id: id as ExerciseId,
    name,
    category: 'Peito',
    equipment: 'Maquina',
    reps: '10-12',
    sets: 3,
    restSeconds: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function plan(id: string, name: string, exercises: Exercise[]): Plan {
  return {
    id: id as PlanId,
    label: 'A',
    name,
    focus: 'Peito',
    exercises,
    syncStatus: 'synced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function session(date: string, exs: { name: string; weight: number }[]): WorkoutSession {
  return {
    id: `s-${date}` as WorkoutId,
    planId: 'p1' as PlanId,
    planName: 'Treino A',
    focus: 'Peito',
    date,
    durationMinutes: 45,
    exercises: exs.map((e) => ({ name: e.name, sets: 3, weight: e.weight })),
    syncStatus: 'synced',
    version: 1,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  }
}

describe('rebuildLastWeights', () => {
  it('returns an empty map when there is no history', () => {
    const plans = [plan('p1', 'Treino A', [ex('e1', 'Supino')])]

    const result = rebuildLastWeights(plans, [])

    expect(result).toEqual({})
  })

  it('maps the latest weight per exercise by name back to the exercise id', () => {
    const plans = [plan('p1', 'Treino A', [ex('e1', 'Supino'), ex('e2', 'Agachamento')])]
    const history = [
      session('2026-04-20', [
        { name: 'Supino', weight: 60 },
        { name: 'Agachamento', weight: 100 },
      ]),
    ]

    const result = rebuildLastWeights(plans, history)

    expect(result).toEqual({ e1: 60, e2: 100 })
  })

  it('uses the most recent session when the same exercise appears multiple times', () => {
    const plans = [plan('p1', 'Treino A', [ex('e1', 'Supino')])]
    const history = [
      session('2026-04-10', [{ name: 'Supino', weight: 55 }]),
      session('2026-04-20', [{ name: 'Supino', weight: 65 }]),
      session('2026-04-05', [{ name: 'Supino', weight: 50 }]),
    ]

    const result = rebuildLastWeights(plans, history)

    expect(result).toEqual({ e1: 65 })
  })

  it('ignores session exercises whose names have no match in any plan', () => {
    const plans = [plan('p1', 'Treino A', [ex('e1', 'Supino')])]
    const history = [
      session('2026-04-20', [
        { name: 'Supino', weight: 60 },
        { name: 'Exercicio Deletado', weight: 20 },
      ]),
    ]

    const result = rebuildLastWeights(plans, history)

    expect(result).toEqual({ e1: 60 })
  })

  it('ignores session entries with weight of zero', () => {
    const plans = [plan('p1', 'Treino A', [ex('e1', 'Supino')])]
    const history = [session('2026-04-20', [{ name: 'Supino', weight: 0 }])]

    const result = rebuildLastWeights(plans, history)

    expect(result).toEqual({})
  })

  it('searches across multiple plans', () => {
    const plans = [
      plan('p1', 'Treino A', [ex('e1', 'Supino')]),
      plan('p2', 'Treino B', [ex('e2', 'Remada')]),
    ]
    const history = [
      session('2026-04-20', [
        { name: 'Supino', weight: 60 },
        { name: 'Remada', weight: 45 },
      ]),
    ]

    const result = rebuildLastWeights(plans, history)

    expect(result).toEqual({ e1: 60, e2: 45 })
  })
})
