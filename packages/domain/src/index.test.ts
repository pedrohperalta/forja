import { describe, expect, it } from 'vitest'

import { MUSCLE_CATEGORIES as MOBILE_MUSCLE_CATEGORIES } from '../../../mobile/src/constants/categories'
import {
  AdminImportExtractWorkoutResponseSchema,
  EquipmentPhotoListResponseSchema,
  EquipmentPhotoUploadResponseSchema,
  MobileAuthExchangeResponseSchema,
  MobileAuthRefreshResponseSchema,
  MUSCLE_CATEGORIES,
  PlanSchema,
  SyncPullResponseSchema,
  SyncPushRequestSchema,
  WorkoutSessionSchema,
} from './index'

const NOW = '2026-05-18T12:00:00.000Z'

const validExercise = {
  id: 'exercise_chest_press',
  name: 'Supino Reto',
  category: 'Peito',
  equipment: 'Barra',
  reps: '10-12',
  sets: 3,
  restSeconds: 60,
  createdAt: NOW,
  updatedAt: NOW,
}

const validPlan = {
  id: 'plan_a',
  label: 'A',
  name: 'Treino A',
  focus: 'Peito / Ombros / Tríceps',
  exercises: [validExercise],
  archived: false,
  createdAt: NOW,
  updatedAt: NOW,
}

const validWorkoutSession = {
  id: 'session_1',
  planId: 'plan_a',
  planName: 'Treino A',
  planLabel: 'A',
  focus: 'Peito / Ombros / Tríceps',
  date: NOW,
  durationMinutes: 42,
  exercises: [
    {
      name: 'Supino Reto',
      sets: 3,
      weight: 80,
    },
  ],
  syncStatus: 'pending',
  version: 2,
  createdAt: NOW,
  updatedAt: NOW,
}

describe('domain schemas', () => {
  it('validates a mobile workout plan', () => {
    expect(PlanSchema.safeParse(validPlan).success).toBe(true)
  })

  it('rejects a workout plan with an invalid category', () => {
    const result = PlanSchema.safeParse({
      ...validPlan,
      exercises: [{ ...validExercise, category: 'Cardio' }],
    })

    expect(result.success).toBe(false)
  })

  it('validates a mobile workout session', () => {
    expect(WorkoutSessionSchema.safeParse(validWorkoutSession).success).toBe(
      true,
    )
  })

  it('validates a sync pull response', () => {
    const result = SyncPullResponseSchema.safeParse({
      cursor: 'server_cursor',
      hasMore: false,
      plans: [
        {
          id: validPlan.id,
          revisionId: 'revision_1',
          data: validPlan,
          updatedAt: NOW,
        },
      ],
      deletedPlanIds: ['plan_deleted'],
      workoutSessions: [
        {
          id: validWorkoutSession.id,
          data: validWorkoutSession,
          updatedAt: NOW,
        },
      ],
      deletedWorkoutSessionIds: ['session_deleted'],
    })

    expect(result.success).toBe(true)
  })

  it('validates a sync push request', () => {
    const result = SyncPushRequestSchema.safeParse({
      workoutSessions: [
        {
          id: validWorkoutSession.id,
          data: validWorkoutSession,
          updatedAt: NOW,
          deletedAt: null,
        },
      ],
      clientMutationId: 'dcb104db-3f5a-45df-88df-ea6b0c462c74',
    })

    expect(result.success).toBe(true)
  })

  it('validates an admin AI import response', () => {
    const result = AdminImportExtractWorkoutResponseSchema.safeParse({
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
    })

    expect(result.success).toBe(true)
  })

  it('keeps domain categories aligned with the mobile app', () => {
    expect(MUSCLE_CATEGORIES).toEqual(MOBILE_MUSCLE_CATEGORIES)
  })

  it('validates mobile auth exchange responses', () => {
    const result = MobileAuthExchangeResponseSchema.safeParse({
      user: {
        id: '0a9d699f-c75f-4a55-a924-79a607f2f420',
        email: 'user@example.com',
        name: 'User',
      },
      tokens: {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresAt: NOW,
      },
    })

    expect(result.success).toBe(true)
  })

  it('validates mobile auth refresh responses', () => {
    const result = MobileAuthRefreshResponseSchema.safeParse({
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      expiresAt: NOW,
    })

    expect(result.success).toBe(true)
  })

  it('validates equipment photo responses', () => {
    expect(
      EquipmentPhotoUploadResponseSchema.safeParse({
        exerciseId: validExercise.id,
        path: 'equipment-photos/user_id/exercise_chest_press.jpg',
        updatedAt: NOW,
      }).success,
    ).toBe(true)

    expect(
      EquipmentPhotoListResponseSchema.safeParse({
        photos: [
          {
            exerciseId: validExercise.id,
            downloadUrl:
              '/api/mobile/v1/photos/equipment/exercise_chest_press/download',
            updatedAt: NOW,
          },
        ],
      }).success,
    ).toBe(true)
  })
})
