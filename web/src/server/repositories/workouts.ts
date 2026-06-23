import { and, eq } from 'drizzle-orm'

import { WorkoutSessionSchema, type WorkoutSession } from '@forja/domain'
import * as schema from '../db/schema'
import { parseWorkoutSession, required, type Database, type WorkoutSessionRow } from './types'

export type UpsertWorkoutSessionInput = {
  id: string
  userId: string
  data: WorkoutSession
  updatedAt: Date
  deletedAt: Date | null
}

export type UpsertWorkoutSessionResult = {
  accepted: boolean
  session: WorkoutSessionRow
}

export async function upsertWorkoutSession(
  db: Database,
  input: UpsertWorkoutSessionInput,
): Promise<UpsertWorkoutSessionResult> {
  const data = WorkoutSessionSchema.parse(input.data)
  const [existing] = await db
    .select()
    .from(schema.workoutSessions)
    .where(eq(schema.workoutSessions.id, input.id))
    .limit(1)

  if (existing && existing.updatedAt >= input.updatedAt) {
    return { accepted: false, session: parseWorkoutSession(existing) }
  }

  const [session] = await db
    .insert(schema.workoutSessions)
    .values({
      id: input.id,
      userId: input.userId,
      data,
      updatedAt: input.updatedAt,
      deletedAt: input.deletedAt,
    })
    .onConflictDoUpdate({
      target: schema.workoutSessions.id,
      set: {
        userId: input.userId,
        data,
        updatedAt: input.updatedAt,
        deletedAt: input.deletedAt,
      },
    })
    .returning()

  return { accepted: true, session: parseWorkoutSession(required(session)) }
}

export async function findWorkoutSessionByRawId(
  db: Database,
  id: string,
): Promise<WorkoutSessionRow | null> {
  const [session] = await db
    .select()
    .from(schema.workoutSessions)
    .where(eq(schema.workoutSessions.id, id))
    .limit(1)

  return session ? parseWorkoutSession(session) : null
}

export async function findWorkoutSessionById(
  db: Database,
  userId: string,
  id: string,
): Promise<WorkoutSessionRow | null> {
  const [session] = await db
    .select()
    .from(schema.workoutSessions)
    .where(and(eq(schema.workoutSessions.userId, userId), eq(schema.workoutSessions.id, id)))
    .limit(1)

  return session ? parseWorkoutSession(session) : null
}

export type MarkWorkoutSessionDeletedInput = {
  id: string
  userId: string
  deletedAt: Date
}

export async function markWorkoutSessionDeleted(
  db: Database,
  input: MarkWorkoutSessionDeletedInput,
): Promise<WorkoutSessionRow | null> {
  const existing = await findWorkoutSessionById(db, input.userId, input.id)

  if (!existing || existing.updatedAt >= input.deletedAt) {
    return existing
  }

  const [session] = await db
    .update(schema.workoutSessions)
    .set({
      updatedAt: input.deletedAt,
      deletedAt: input.deletedAt,
    })
    .where(
      and(eq(schema.workoutSessions.userId, input.userId), eq(schema.workoutSessions.id, input.id)),
    )
    .returning()

  return session ? parseWorkoutSession(session) : null
}
