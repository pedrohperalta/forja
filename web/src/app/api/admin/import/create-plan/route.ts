import { randomUUID } from 'node:crypto'

import { AdminImportExtractedWorkoutSchema, type AdminImportExtractedWorkout } from '@forja/domain'
import { z } from 'zod'

import { ADMIN_SESSION_COOKIE, getAdminUserFromSessionToken } from '@/server/auth/adminAuth'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import { errorResponse, jsonWithRequestId, requestId } from '@/server/http/responses'
import { createDraftPlan } from '@/server/services/plans/planService'

const CreateImportedPlanRequestSchema = z.object({
  workout: AdminImportExtractedWorkoutSchema,
})

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const db = getDatabase()
  const admin = await getAdminUserFromSessionToken({
    db,
    env: readServerEnv(),
    sessionToken: getCookieValue(request.headers, ADMIN_SESSION_COOKIE),
    now: new Date(),
  })

  if (!admin) {
    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }

  const parsed = CreateImportedPlanRequestSchema.safeParse(await request.json())

  if (!parsed.success) {
    return errorResponse('invalid_request', 'Invalid import plan request', 400, id)
  }

  try {
    const now = new Date()
    const planId = createImportedPlanId(parsed.data.workout.name)
    const label = createImportedPlanLabel(parsed.data.workout.name)

    await createDraftPlan(db, {
      userId: admin.id,
      planId,
      label,
      name: parsed.data.workout.name,
      focus: createImportedPlanFocus(parsed.data.workout),
      exercises: parsed.data.workout.exercises.map((exercise, index) => ({
        id: `exercise_${randomUUID()}_${index}`,
        name: exercise.name,
        category: exercise.category,
        equipment: exercise.equipment,
        reps: exercise.reps,
        sets: exercise.sets,
        restSeconds: exercise.restSeconds,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })),
      now,
    })

    return jsonWithRequestId({ planId }, 200, id)
  } catch {
    return errorResponse('internal_error', 'Imported plan could not be created', 500, id)
  }
}

function createImportedPlanId(name: string): string {
  const slug = createSlug(name)

  return slug ? `plan_${slug}` : `plan_${randomUUID()}`
}

function createImportedPlanLabel(name: string): string {
  return name.trim() || 'Ficha importada'
}

function createImportedPlanFocus(workout: AdminImportExtractedWorkout): string {
  const categories = Array.from(new Set(workout.exercises.map((exercise) => exercise.category)))

  return categories.slice(0, 3).join(' / ') || 'Ficha importada'
}

function createSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getCookieValue(headers: Headers, name: string): string | null {
  const cookie = headers.get('cookie')
  if (!cookie) {
    return null
  }

  const prefix = `${name}=`
  const pair = cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))

  return pair?.slice(prefix.length) ?? null
}
