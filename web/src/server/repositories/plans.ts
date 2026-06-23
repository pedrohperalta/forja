import { and, asc, desc, eq, isNull, max } from 'drizzle-orm'

import { PlanSchema, type Plan } from '@forja/domain'
import * as schema from '../db/schema'
import {
  parsePlanDraft,
  parsePlanRevision,
  required,
  type Database,
  type PlanDraftRow,
  type PlanRevisionRow,
  type PlanRow,
  type PlanTombstoneRow,
} from './types'

export type CreatePlanDraftInput = {
  planId: string
  userId: string
  label: string
  data: Plan
  now: Date
}

export async function createPlanDraft(
  db: Database,
  input: CreatePlanDraftInput,
): Promise<PlanDraftRow> {
  const data = PlanSchema.parse(input.data)

  await db
    .insert(schema.plans)
    .values({
      id: input.planId,
      userId: input.userId,
      label: input.label,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: schema.plans.id,
      set: {
        label: input.label,
        updatedAt: input.now,
      },
    })

  const [draft] = await db
    .insert(schema.planDrafts)
    .values({
      planId: input.planId,
      userId: input.userId,
      data,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: schema.planDrafts.planId,
      set: {
        data,
        updatedAt: input.now,
      },
    })
    .returning()

  return parsePlanDraft(required(draft))
}

export type UpdatePlanDraftInput = {
  planId: string
  userId: string
  label: string
  data: Plan
  now: Date
}

export async function updatePlanDraft(
  db: Database,
  input: UpdatePlanDraftInput,
): Promise<PlanDraftRow | null> {
  const data = PlanSchema.parse(input.data)

  await db
    .update(schema.plans)
    .set({
      label: input.label,
      updatedAt: input.now,
    })
    .where(and(eq(schema.plans.id, input.planId), eq(schema.plans.userId, input.userId)))

  const [draft] = await db
    .update(schema.planDrafts)
    .set({
      data,
      updatedAt: input.now,
    })
    .where(
      and(eq(schema.planDrafts.planId, input.planId), eq(schema.planDrafts.userId, input.userId)),
    )
    .returning()

  return draft ? parsePlanDraft(draft) : null
}

export async function findPlanById(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanRow | null> {
  const [plan] = await db
    .select()
    .from(schema.plans)
    .where(and(eq(schema.plans.userId, userId), eq(schema.plans.id, planId)))
    .limit(1)

  return plan ?? null
}

export async function deletePlanById(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanRow | null> {
  const [plan] = await db
    .delete(schema.plans)
    .where(and(eq(schema.plans.userId, userId), eq(schema.plans.id, planId)))
    .returning()

  return plan ?? null
}

export async function restorePlanById(
  db: Database,
  userId: string,
  planId: string,
  restoredAt: Date,
): Promise<PlanRow | null> {
  const [plan] = await db
    .update(schema.plans)
    .set({ archivedAt: null, updatedAt: restoredAt })
    .where(and(eq(schema.plans.userId, userId), eq(schema.plans.id, planId)))
    .returning()

  return plan ?? null
}

export async function deletePlanTombstone(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanTombstoneRow | null> {
  const [tombstone] = await db
    .delete(schema.planTombstones)
    .where(and(eq(schema.planTombstones.userId, userId), eq(schema.planTombstones.planId, planId)))
    .returning()

  return tombstone ?? null
}

export async function findPlanDraft(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanDraftRow | null> {
  const [draft] = await db
    .select()
    .from(schema.planDrafts)
    .where(and(eq(schema.planDrafts.userId, userId), eq(schema.planDrafts.planId, planId)))
    .limit(1)

  return draft ? parsePlanDraft(draft) : null
}

export async function listPlansByUser(
  db: Database,
  userId: string,
  includeArchived = false,
): Promise<PlanRow[]> {
  const predicates = [eq(schema.plans.userId, userId)]

  if (!includeArchived) {
    predicates.push(isNull(schema.plans.archivedAt))
  }

  return db
    .select()
    .from(schema.plans)
    .where(and(...predicates))
    .orderBy(asc(schema.plans.label), asc(schema.plans.id))
}

export async function findLatestPlanRevision(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanRevisionRow | null> {
  const [revision] = await db
    .select()
    .from(schema.planRevisions)
    .where(and(eq(schema.planRevisions.userId, userId), eq(schema.planRevisions.planId, planId)))
    .orderBy(desc(schema.planRevisions.revisionNumber))
    .limit(1)

  return revision ? parsePlanRevision(revision) : null
}

export async function findPlanTombstone(
  db: Database,
  userId: string,
  planId: string,
): Promise<PlanTombstoneRow | null> {
  const [tombstone] = await db
    .select()
    .from(schema.planTombstones)
    .where(and(eq(schema.planTombstones.userId, userId), eq(schema.planTombstones.planId, planId)))
    .limit(1)

  return tombstone ?? null
}

export type PublishPlanRevisionInput = {
  planId: string
  userId: string
  data: Plan
  now: Date
}

export async function publishPlanRevision(
  db: Database,
  input: PublishPlanRevisionInput,
): Promise<PlanRevisionRow> {
  const data = PlanSchema.parse(input.data)
  const [revisionState] = await db
    .select({ current: max(schema.planRevisions.revisionNumber) })
    .from(schema.planRevisions)
    .where(eq(schema.planRevisions.planId, input.planId))

  const revisionNumber = (revisionState?.current ?? 0) + 1
  const [revision] = await db
    .insert(schema.planRevisions)
    .values({
      planId: input.planId,
      userId: input.userId,
      revisionNumber,
      data,
      publishedAt: input.now,
      createdAt: input.now,
    })
    .returning()

  return parsePlanRevision(required(revision))
}

export type CreatePlanTombstoneInput = {
  planId: string
  userId: string
  deletedAt: Date
}

export async function createPlanTombstone(
  db: Database,
  input: CreatePlanTombstoneInput,
): Promise<PlanTombstoneRow> {
  await db
    .update(schema.plans)
    .set({ archivedAt: input.deletedAt, updatedAt: input.deletedAt })
    .where(eq(schema.plans.id, input.planId))

  const [tombstone] = await db
    .insert(schema.planTombstones)
    .values(input)
    .onConflictDoUpdate({
      target: schema.planTombstones.planId,
      set: {
        userId: input.userId,
        deletedAt: input.deletedAt,
      },
    })
    .returning()

  return required(tombstone)
}
