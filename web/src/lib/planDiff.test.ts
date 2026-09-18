import { describe, expect, it } from 'vitest'

import type { Plan } from '@forja/domain'

import { diffPlans } from './planDiff'

const NOW = '2026-05-18T12:00:00.000Z'

function createPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: 'plan_a',
    label: 'A',
    name: 'Treino A',
    focus: 'Peito',
    exercises: [
      {
        id: 'supino',
        name: 'Supino Reto',
        category: 'Peito',
        equipment: 'Barra',
        reps: '10-12',
        sets: 3,
        restSeconds: 60,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'remada',
        name: 'Remada Baixa',
        category: 'Costas',
        equipment: 'Máquina',
        reps: '10-12',
        sets: 3,
        restSeconds: 60,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('diffPlans', () => {
  it('returns nothing when the draft matches the published revision', () => {
    const plan = createPlan()

    expect(diffPlans(plan, createPlan())).toEqual([])
  })

  it('ignores transient metadata and timestamps', () => {
    const draft = createPlan({
      importedAt: NOW,
      exercises: [
        { ...createPlan().exercises[0]!, needsReview: true },
        createPlan().exercises[1]!,
      ],
      updatedAt: '2026-09-18T12:00:00.000Z',
    })

    expect(diffPlans(draft, createPlan())).toEqual([])
  })

  it('reports changed plan fields with from/to values', () => {
    const draft = createPlan({ name: 'Treino A v2', focus: 'Peito e Ombros' })
    const diff = diffPlans(draft, createPlan())

    expect(diff).toEqual([
      { kind: 'plan-field', field: 'Nome', from: 'Treino A', to: 'Treino A v2' },
      { kind: 'plan-field', field: 'Foco', from: 'Peito', to: 'Peito e Ombros' },
    ])
  })

  it('reports added and removed exercises by identity', () => {
    const draft = createPlan({
      exercises: [
        createPlan().exercises[0]!,
        {
          id: 'elevacao',
          name: 'Elevação Lateral',
          category: 'Ombros',
          equipment: 'Halter',
          reps: '12-15',
          sets: 3,
          restSeconds: 45,
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    })

    expect(diffPlans(draft, createPlan())).toEqual([
      { kind: 'exercise-removed', exerciseName: 'Remada Baixa' },
      { kind: 'exercise-added', exerciseName: 'Elevação Lateral' },
    ])
  })

  it('reports changed exercise fields with the exercise name', () => {
    const draft = createPlan({
      exercises: [
        { ...createPlan().exercises[0]!, sets: 5, restSeconds: 90 },
        createPlan().exercises[1]!,
      ],
    })

    expect(diffPlans(draft, createPlan())).toEqual([
      {
        kind: 'exercise-field',
        exerciseName: 'Supino Reto',
        field: 'Séries',
        from: '3',
        to: '5',
      },
      {
        kind: 'exercise-field',
        exerciseName: 'Supino Reto',
        field: 'Descanso',
        from: '60s',
        to: '90s',
      },
    ])
  })

  it('matches renamed exercises instead of reporting add + remove', () => {
    const draft = createPlan({
      exercises: [
        { ...createPlan().exercises[0]!, name: 'Supino Inclinado' },
        createPlan().exercises[1]!,
      ],
    })

    expect(diffPlans(draft, createPlan())).toEqual([
      {
        kind: 'exercise-field',
        exerciseName: 'Supino Inclinado',
        field: 'Nome',
        from: 'Supino Reto',
        to: 'Supino Inclinado',
      },
    ])
  })
})
