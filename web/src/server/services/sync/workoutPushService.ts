import {
  SyncPushRequestSchema,
  SyncPushResponseSchema,
  type SyncPushRequest,
  type SyncPushResponse,
  type WorkoutSessionChange,
} from '@forja/domain'
import {
  findWorkoutSessionByRawId,
  markWorkoutSessionDeleted,
  upsertWorkoutSession,
  type Database,
  type WorkoutSessionRow,
} from '../../repositories'

export type PushWorkoutSessionsInput = {
  userId: string
  request: SyncPushRequest
}

export type DeleteWorkoutSessionInput = {
  userId: string
  sessionId: string
  now: Date
}

export async function pushWorkoutSessions(
  db: Database,
  input: PushWorkoutSessionsInput,
): Promise<SyncPushResponse> {
  const request = SyncPushRequestSchema.parse(input.request)
  const acceptedWorkoutSessionIds: string[] = []
  const skippedWorkoutSessionIds: string[] = []
  const currentWorkoutSessions: WorkoutSessionChange[] = []

  for (const incomingSession of request.workoutSessions) {
    const existing = await findWorkoutSessionByRawId(db, incomingSession.id)

    if (existing && existing.userId !== input.userId) {
      skippedWorkoutSessionIds.push(incomingSession.id)
      continue
    }

    const result = await upsertWorkoutSession(db, {
      id: incomingSession.id,
      userId: input.userId,
      data: incomingSession.data,
      updatedAt: new Date(incomingSession.updatedAt),
      deletedAt: incomingSession.deletedAt
        ? new Date(incomingSession.deletedAt)
        : null,
    })

    if (result.accepted) {
      acceptedWorkoutSessionIds.push(incomingSession.id)
    } else {
      skippedWorkoutSessionIds.push(incomingSession.id)
    }

    currentWorkoutSessions.push(toWorkoutSessionChange(result.session))
  }

  return SyncPushResponseSchema.parse({
    ok: true,
    acceptedWorkoutSessionIds,
    skippedWorkoutSessionIds,
    currentWorkoutSessions,
  })
}

export async function deleteWorkoutSession(
  db: Database,
  input: DeleteWorkoutSessionInput,
): Promise<{ ok: true }> {
  await markWorkoutSessionDeleted(db, {
    id: input.sessionId,
    userId: input.userId,
    deletedAt: input.now,
  })

  return { ok: true }
}

function toWorkoutSessionChange(row: WorkoutSessionRow): WorkoutSessionChange {
  return {
    id: row.id,
    data: row.data,
    updatedAt: row.updatedAt.toISOString(),
  }
}
