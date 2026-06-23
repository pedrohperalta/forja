import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import {
  PlanSchema,
  SyncPullResponseSchema,
  type PublishedPlanChange,
  type SyncPullResponse,
} from '@forja/domain'
import * as schema from '../../db/schema'
import type { Database } from '../../repositories'
import { base64UrlDecode, base64UrlEncode, hmacSha256, safeEqual } from '../../auth/crypto'
import { invalidCursor } from '@/server/http/appError'

const MAX_PULL_CHANGES = 500
const INITIAL_CURSOR = {
  lastChangedAt: '1970-01-01T00:00:00.000Z',
  lastId: '',
}

const SyncCursorPayloadSchema = z.object({
  lastChangedAt: z.string().datetime(),
  lastId: z.string(),
})

type SyncCursorPayload = z.infer<typeof SyncCursorPayloadSchema>

type PullPlanChangesInput = {
  userId: string
  cursor: string | null
  cursorSecret: string
  limit?: number
}

type PlanChange = {
  type: 'plan'
  id: string
  changedAt: Date
  revision: typeof schema.planRevisions.$inferSelect
}

type TombstoneChange = {
  type: 'tombstone'
  id: string
  changedAt: Date
}

type SyncChange = PlanChange | TombstoneChange

export function signSyncCursor(payload: SyncCursorPayload, secret: string): string {
  const parsed = SyncCursorPayloadSchema.parse(payload)
  const encodedPayload = base64UrlEncode(JSON.stringify(parsed))
  const signature = hmacSha256(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export function verifySyncCursor(cursor: string, secret: string): SyncCursorPayload {
  const [encodedPayload, signature] = cursor.split('.')

  if (!encodedPayload || !signature) {
    throw invalidCursor('Invalid cursor')
  }

  const expectedSignature = hmacSha256(encodedPayload, secret)
  if (!safeEqual(signature, expectedSignature)) {
    throw invalidCursor('Invalid cursor')
  }

  try {
    return SyncCursorPayloadSchema.parse(JSON.parse(base64UrlDecode(encodedPayload)))
  } catch {
    throw invalidCursor('Invalid cursor')
  }
}

export async function pullPlanChanges(
  db: Database,
  input: PullPlanChangesInput,
): Promise<SyncPullResponse> {
  const cursorPayload = input.cursor
    ? verifySyncCursor(input.cursor, input.cursorSecret)
    : INITIAL_CURSOR
  const limit = Math.min(input.limit ?? MAX_PULL_CHANGES, MAX_PULL_CHANGES)
  const allChanges = await listPlanSyncChanges(db, input.userId)
  const filteredChanges = allChanges.filter((change) => isAfterCursor(change, cursorPayload))
  const selectedChanges = filteredChanges.slice(0, limit)
  const lastChange = selectedChanges.at(-1)
  const nextCursorPayload = lastChange
    ? {
        lastChangedAt: lastChange.changedAt.toISOString(),
        lastId: lastChange.id,
      }
    : cursorPayload

  const response = {
    cursor: signSyncCursor(nextCursorPayload, input.cursorSecret),
    hasMore: filteredChanges.length > limit,
    plans: selectedChanges
      .filter((change): change is PlanChange => change.type === 'plan')
      .map((change) => toPublishedPlanChange(change)),
    deletedPlanIds: selectedChanges
      .filter((change): change is TombstoneChange => change.type === 'tombstone')
      .map((change) => change.id),
    workoutSessions: [],
    deletedWorkoutSessionIds: [],
  } satisfies SyncPullResponse

  return SyncPullResponseSchema.parse(response)
}

async function listPlanSyncChanges(db: Database, userId: string): Promise<SyncChange[]> {
  const [plans, revisions, tombstones] = await Promise.all([
    db
      .select()
      .from(schema.plans)
      .where(and(eq(schema.plans.userId, userId), isNull(schema.plans.archivedAt))),
    db
      .select()
      .from(schema.planRevisions)
      .where(eq(schema.planRevisions.userId, userId))
      .orderBy(asc(schema.planRevisions.publishedAt), asc(schema.planRevisions.planId)),
    db
      .select()
      .from(schema.planTombstones)
      .where(eq(schema.planTombstones.userId, userId))
      .orderBy(asc(schema.planTombstones.deletedAt), asc(schema.planTombstones.planId)),
  ])
  const activePlanIds = new Set(plans.map((plan) => plan.id))
  const latestRevisionByPlanId = new Map<string, typeof schema.planRevisions.$inferSelect>()

  for (const revision of revisions) {
    if (!activePlanIds.has(revision.planId)) {
      continue
    }

    const existing = latestRevisionByPlanId.get(revision.planId)
    if (!existing || revision.revisionNumber > existing.revisionNumber) {
      latestRevisionByPlanId.set(revision.planId, revision)
    }
  }

  return [
    ...Array.from(latestRevisionByPlanId.values()).map(
      (revision): PlanChange => ({
        type: 'plan',
        id: revision.planId,
        changedAt: revision.publishedAt,
        revision,
      }),
    ),
    ...tombstones.map(
      (tombstone): TombstoneChange => ({
        type: 'tombstone',
        id: tombstone.planId,
        changedAt: tombstone.deletedAt,
      }),
    ),
  ].sort(compareChanges)
}

function compareChanges(left: SyncChange, right: SyncChange): number {
  const timeDifference = left.changedAt.getTime() - right.changedAt.getTime()

  if (timeDifference !== 0) {
    return timeDifference
  }

  return left.id.localeCompare(right.id)
}

function isAfterCursor(change: SyncChange, cursor: SyncCursorPayload): boolean {
  const cursorTime = new Date(cursor.lastChangedAt).getTime()
  const changeTime = change.changedAt.getTime()

  return changeTime > cursorTime || (changeTime === cursorTime && change.id > cursor.lastId)
}

function toPublishedPlanChange(change: PlanChange): PublishedPlanChange {
  return {
    id: change.revision.planId,
    revisionId: change.revision.id,
    data: PlanSchema.parse(change.revision.data),
    updatedAt: change.revision.publishedAt.toISOString(),
  }
}
