import { ExerciseSchema, PlanSchema } from '@/schemas/plan'

describe('ExerciseSchema', () => {
  const validExercise = {
    id: 'ex-1',
    name: 'Supino Reto',
    category: 'Peito',
    equipment: 'Maquina',
    reps: '10-15',
    sets: 3,
    restSeconds: 60,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('accepts a valid exercise', () => {
    const result = ExerciseSchema.safeParse(validExercise)
    expect(result.success).toBe(true)
  })

  it('rejects exercise missing restSeconds', () => {
    const { restSeconds: _, ...invalid } = validExercise
    const result = ExerciseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects exercise missing createdAt', () => {
    const { createdAt: _, ...invalid } = validExercise
    const result = ExerciseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects exercise with wrong type for sets', () => {
    const result = ExerciseSchema.safeParse({ ...validExercise, sets: '3' })
    expect(result.success).toBe(false)
  })
})

describe('PlanSchema', () => {
  const validPlan = {
    id: 'A',
    label: 'A',
    name: 'Treino A',
    focus: 'Peito / Ombros / Triceps',
    exercises: [
      {
        id: 'ex-1',
        name: 'Supino Reto',
        category: 'Peito',
        equipment: 'Maquina',
        reps: '10-15',
        sets: 3,
        restSeconds: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('accepts a valid plan', () => {
    const result = PlanSchema.safeParse(validPlan)
    expect(result.success).toBe(true)
  })

  it('rejects plan missing label', () => {
    const { label: _, ...invalid } = validPlan
    const result = PlanSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects plan missing createdAt', () => {
    const { createdAt: _, ...invalid } = validPlan
    const result = PlanSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects plan with empty exercises array type mismatch', () => {
    const result = PlanSchema.safeParse({ ...validPlan, exercises: 'not-array' })
    expect(result.success).toBe(false)
  })

  it('accepts plan with empty exercises array', () => {
    const result = PlanSchema.safeParse({ ...validPlan, exercises: [] })
    expect(result.success).toBe(true)
  })
})
