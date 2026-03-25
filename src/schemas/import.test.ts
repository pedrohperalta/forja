/**
 * Import schema tests — TDD: tests first, implementation second.
 *
 * Tests Zod validation for ExtractedExercise, ExtractedWorkout, and
 * ExtractWorkoutResponse schemas.
 */

import {
  ExtractedExerciseSchema,
  ExtractedWorkoutSchema,
  ExtractWorkoutResponseSchema,
} from '@/schemas/import'

describe('ExtractedExerciseSchema', () => {
  const validExercise = {
    name: 'Supino Reto',
    category: 'Peito',
    sets: 3,
    reps: '10-12',
    restSeconds: 60,
    equipment: 'Barra',
    confidence: 0.95,
  }

  it('accepts a valid exercise', () => {
    const result = ExtractedExerciseSchema.safeParse(validExercise)
    expect(result.success).toBe(true)
  })

  it('rejects exercise with missing name', () => {
    const { name: _, ...invalid } = validExercise
    const result = ExtractedExerciseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects exercise with missing category', () => {
    const { category: _, ...invalid } = validExercise
    const result = ExtractedExerciseSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects exercise with sets < 1', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, sets: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with sets > 20', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, sets: 21 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with restSeconds < 0', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, restSeconds: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with restSeconds > 600', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, restSeconds: 601 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with confidence < 0', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, confidence: -0.1 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with confidence > 1', () => {
    const result = ExtractedExerciseSchema.safeParse({ ...validExercise, confidence: 1.1 })
    expect(result.success).toBe(false)
  })

  it('rejects exercise with invalid category', () => {
    const result = ExtractedExerciseSchema.safeParse({
      ...validExercise,
      category: 'InvalidCategory',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid MUSCLE_CATEGORIES', () => {
    const categories = [
      'Peito',
      'Costas',
      'Ombros',
      'Bíceps',
      'Tríceps',
      'Antebraço',
      'Abdômen',
      'Quadríceps',
      'Posterior',
      'Glúteos',
      'Panturrilha',
      'Corpo Inteiro',
    ]
    for (const category of categories) {
      const result = ExtractedExerciseSchema.safeParse({ ...validExercise, category })
      expect(result.success).toBe(true)
    }
  })
})

describe('ExtractedWorkoutSchema', () => {
  const validWorkout = {
    name: 'Treino de Peito',
    exercises: [
      {
        name: 'Supino Reto',
        category: 'Peito',
        sets: 3,
        reps: '10-12',
        restSeconds: 60,
        equipment: 'Barra',
        confidence: 0.95,
      },
    ],
  }

  it('accepts a valid workout', () => {
    const result = ExtractedWorkoutSchema.safeParse(validWorkout)
    expect(result.success).toBe(true)
  })

  it('rejects workout with missing name', () => {
    const { name: _, ...invalid } = validWorkout
    const result = ExtractedWorkoutSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('rejects workout with empty exercises array', () => {
    const result = ExtractedWorkoutSchema.safeParse({ ...validWorkout, exercises: [] })
    expect(result.success).toBe(false)
  })

  it('rejects workout with invalid exercise in array', () => {
    const result = ExtractedWorkoutSchema.safeParse({
      ...validWorkout,
      exercises: [{ name: 'Bad' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('ExtractWorkoutResponseSchema', () => {
  const validResponse = {
    workout: {
      name: 'Treino de Peito',
      exercises: [
        {
          name: 'Supino Reto',
          category: 'Peito',
          sets: 3,
          reps: '10-12',
          restSeconds: 60,
          equipment: 'Barra',
          confidence: 0.95,
        },
      ],
    },
  }

  it('accepts a valid response', () => {
    const result = ExtractWorkoutResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects response without workout key', () => {
    const result = ExtractWorkoutResponseSchema.safeParse({ data: validResponse.workout })
    expect(result.success).toBe(false)
  })
})
