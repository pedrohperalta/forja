import { and, asc, desc, eq, gt, isNull, max, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  PlanSchema,
  WorkoutSessionSchema,
  type Plan,
  type WorkoutSession,
} from '@forja/domain'
import * as schema from '../db/schema'

export type Database = PostgresJsDatabase<typeof schema>

export type UserRow = typeof schema.users.$inferSelect
export type OAuthAccountRow = typeof schema.oauthAccounts.$inferSelect
export type RefreshTokenRow = typeof schema.refreshTokens.$inferSelect
export type AdminSessionRow = typeof schema.adminSessions.$inferSelect
export type MobileAuthCodeRow = typeof schema.mobileAuthCodes.$inferSelect
export type PlanRow = typeof schema.plans.$inferSelect
export type PlanDraftRow = typeof schema.planDrafts.$inferSelect & {
  data: Plan
}
export type PlanRevisionRow = typeof schema.planRevisions.$inferSelect & {
  data: Plan
}
export type PlanTombstoneRow = typeof schema.planTombstones.$inferSelect
export type WorkoutSessionRow = typeof schema.workoutSessions.$inferSelect & {
  data: WorkoutSession
}
export type EquipmentPhotoRow = typeof schema.equipmentPhotos.$inferSelect
export type ImportJobRow = typeof schema.importJobs.$inferSelect

export type CreateUserInput = {
  id?: string
  email: string
  name?: string
  avatarUrl?: string
  now: Date
}

export async function createUser(
  db: Database,
  input: CreateUserInput,
): Promise<UserRow> {
  const [user] = await db
    .insert(schema.users)
    .values({
      id: input.id,
      email: input.email,
      name: input.name ?? null,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning()

  return required(user)
}

export async function findUserByEmail(
  db: Database,
  email: string,
): Promise<UserRow | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  return user ?? null
}

export async function findUserById(
  db: Database,
  id: string,
): Promise<UserRow | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)

  return user ?? null
}

export type LinkOAuthAccountInput = {
  userId: string
  provider: string
  providerAccountId: string
  now: Date
}

export async function linkOAuthAccount(
  db: Database,
  input: LinkOAuthAccountInput,
): Promise<OAuthAccountRow> {
  const [account] = await db
    .insert(schema.oauthAccounts)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [
        schema.oauthAccounts.provider,
        schema.oauthAccounts.providerAccountId,
      ],
      set: {
        userId: input.userId,
        updatedAt: input.now,
      },
    })
    .returning()

  return required(account)
}

export async function findOAuthAccount(
  db: Database,
  provider: string,
  providerAccountId: string,
): Promise<OAuthAccountRow | null> {
  const [account] = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.provider, provider),
        eq(schema.oauthAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1)

  return account ?? null
}

export type CreateRefreshTokenInput = {
  userId: string
  tokenHash: string
  familyId: string
  expiresAt: Date
  now: Date
}

export async function createRefreshToken(
  db: Database,
  input: CreateRefreshTokenInput,
): Promise<RefreshTokenRow> {
  const [token] = await db
    .insert(schema.refreshTokens)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(token)
}

export async function revokeRefreshToken(
  db: Database,
  tokenHash: string,
  revokedAt: Date,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .update(schema.refreshTokens)
    .set({ revokedAt })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .returning()

  return token ?? null
}

export async function findRefreshTokenByHash(
  db: Database,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .select()
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .limit(1)

  return token ?? null
}

export async function markRefreshTokenRotated(
  db: Database,
  tokenHash: string,
  rotatedAt: Date,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .update(schema.refreshTokens)
    .set({ rotatedAt })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .returning()

  return token ?? null
}

export async function revokeRefreshTokenFamily(
  db: Database,
  familyId: string,
  revokedAt: Date,
): Promise<RefreshTokenRow[]> {
  return db
    .update(schema.refreshTokens)
    .set({ revokedAt })
    .where(eq(schema.refreshTokens.familyId, familyId))
    .returning()
}

export type CreateAdminSessionInput = {
  userId: string
  sessionHash: string
  expiresAt: Date
  now: Date
}

export async function createAdminSession(
  db: Database,
  input: CreateAdminSessionInput,
): Promise<AdminSessionRow> {
  const [session] = await db
    .insert(schema.adminSessions)
    .values({
      userId: input.userId,
      sessionHash: input.sessionHash,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(session)
}

export async function revokeAdminSession(
  db: Database,
  sessionHash: string,
  revokedAt: Date,
): Promise<AdminSessionRow | null> {
  const [session] = await db
    .update(schema.adminSessions)
    .set({ revokedAt })
    .where(eq(schema.adminSessions.sessionHash, sessionHash))
    .returning()

  return session ?? null
}

export async function findAdminSessionByHash(
  db: Database,
  sessionHash: string,
): Promise<AdminSessionRow | null> {
  const [session] = await db
    .select()
    .from(schema.adminSessions)
    .where(eq(schema.adminSessions.sessionHash, sessionHash))
    .limit(1)

  return session ?? null
}

export type CreateMobileAuthCodeInput = {
  userId: string
  codeHash: string
  redirectUri: string
  expiresAt: Date
  now: Date
}

export async function createMobileAuthCode(
  db: Database,
  input: CreateMobileAuthCodeInput,
): Promise<MobileAuthCodeRow> {
  const [code] = await db
    .insert(schema.mobileAuthCodes)
    .values({
      userId: input.userId,
      codeHash: input.codeHash,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(code)
}

export async function useMobileAuthCode(
  db: Database,
  codeHash: string,
  redirectUriOrUsedAt: string | Date,
  maybeUsedAt?: Date,
): Promise<MobileAuthCodeRow | null> {
  const redirectUri =
    typeof redirectUriOrUsedAt === 'string' ? redirectUriOrUsedAt : null
  const usedAt =
    redirectUriOrUsedAt instanceof Date ? redirectUriOrUsedAt : maybeUsedAt

  if (!usedAt) {
    throw new Error('usedAt is required')
  }

  const predicates = [
    eq(schema.mobileAuthCodes.codeHash, codeHash),
    isNull(schema.mobileAuthCodes.usedAt),
    gt(schema.mobileAuthCodes.expiresAt, usedAt),
  ]
  if (redirectUri) {
    predicates.push(eq(schema.mobileAuthCodes.redirectUri, redirectUri))
  }

  const [code] = await db
    .update(schema.mobileAuthCodes)
    .set({ usedAt })
    .where(and(...predicates))
    .returning()

  return code ?? null
}

export async function useMobileAuthCodeDeprecated(
  db: Database,
  codeHash: string,
  usedAt: Date,
): Promise<MobileAuthCodeRow | null> {
  return useMobileAuthCode(db, codeHash, usedAt)
}

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
    .where(
      and(eq(schema.plans.id, input.planId), eq(schema.plans.userId, input.userId)),
    )

  const [draft] = await db
    .update(schema.planDrafts)
    .set({
      data,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(schema.planDrafts.planId, input.planId),
        eq(schema.planDrafts.userId, input.userId),
      ),
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
    .where(
      and(
        eq(schema.planTombstones.userId, userId),
        eq(schema.planTombstones.planId, planId),
      ),
    )
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
    .where(
      and(
        eq(schema.planDrafts.userId, userId),
        eq(schema.planDrafts.planId, planId),
      ),
    )
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
    .where(
      and(
        eq(schema.planRevisions.userId, userId),
        eq(schema.planRevisions.planId, planId),
      ),
    )
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
    .where(
      and(
        eq(schema.planTombstones.userId, userId),
        eq(schema.planTombstones.planId, planId),
      ),
    )
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
    .where(
      and(
        eq(schema.workoutSessions.userId, userId),
        eq(schema.workoutSessions.id, id),
      ),
    )
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
      and(
        eq(schema.workoutSessions.userId, input.userId),
        eq(schema.workoutSessions.id, input.id),
      ),
    )
    .returning()

  return session ? parseWorkoutSession(session) : null
}

export type CreateOrUpdateEquipmentPhotoInput = {
  userId: string
  exerciseId: string
  path: string
  contentType: string
  byteSize: number
  now: Date
}

export async function createOrUpdateEquipmentPhoto(
  db: Database,
  input: CreateOrUpdateEquipmentPhotoInput,
): Promise<EquipmentPhotoRow> {
  const [existing] = await db
    .select()
    .from(schema.equipmentPhotos)
    .where(
      and(
        eq(schema.equipmentPhotos.userId, input.userId),
        eq(schema.equipmentPhotos.exerciseId, input.exerciseId),
      ),
    )
    .orderBy(asc(schema.equipmentPhotos.createdAt))
    .limit(1)

  if (existing) {
    const [photo] = await db
      .update(schema.equipmentPhotos)
      .set({
        path: input.path,
        contentType: input.contentType,
        byteSize: input.byteSize,
        updatedAt: input.now,
        deletedAt: null,
      })
      .where(eq(schema.equipmentPhotos.id, existing.id))
      .returning()

    return required(photo)
  }

  const [photo] = await db
    .insert(schema.equipmentPhotos)
    .values({
      userId: input.userId,
      exerciseId: input.exerciseId,
      path: input.path,
      contentType: input.contentType,
      byteSize: input.byteSize,
      updatedAt: input.now,
      createdAt: input.now,
      deletedAt: null,
    })
    .returning()

  return required(photo)
}

export async function listActiveEquipmentPhotos(
  db: Database,
  userId: string,
): Promise<EquipmentPhotoRow[]> {
  return db
    .select()
    .from(schema.equipmentPhotos)
    .where(
      and(
        eq(schema.equipmentPhotos.userId, userId),
        isNull(schema.equipmentPhotos.deletedAt),
      ),
    )
    .orderBy(asc(schema.equipmentPhotos.exerciseId))
}

export async function findActiveEquipmentPhoto(
  db: Database,
  userId: string,
  exerciseId: string,
): Promise<EquipmentPhotoRow | null> {
  const [photo] = await db
    .select()
    .from(schema.equipmentPhotos)
    .where(
      and(
        eq(schema.equipmentPhotos.userId, userId),
        eq(schema.equipmentPhotos.exerciseId, exerciseId),
        isNull(schema.equipmentPhotos.deletedAt),
      ),
    )
    .limit(1)

  return photo ?? null
}

export async function markEquipmentPhotoDeleted(
  db: Database,
  userId: string,
  exerciseId: string,
  deletedAt: Date,
): Promise<EquipmentPhotoRow | null> {
  const [photo] = await db
    .update(schema.equipmentPhotos)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(
      and(
        eq(schema.equipmentPhotos.userId, userId),
        eq(schema.equipmentPhotos.exerciseId, exerciseId),
        isNull(schema.equipmentPhotos.deletedAt),
      ),
    )
    .returning()

  return photo ?? null
}

export type CreateImportJobInput = {
  userId: string | null
  label: string | null
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string | null
  completedAt?: Date | null
  now: Date
}

export async function createImportJob(
  db: Database,
  input: CreateImportJobInput,
): Promise<ImportJobRow> {
  const [job] = await db
    .insert(schema.importJobs)
    .values({
      userId: input.userId,
      label: input.label,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      completedAt: input.completedAt ?? null,
      createdAt: input.now,
    })
    .returning()

  return required(job)
}

function parsePlanDraft(row: typeof schema.planDrafts.$inferSelect): PlanDraftRow {
  return { ...row, data: PlanSchema.parse(row.data) }
}

function parsePlanRevision(
  row: typeof schema.planRevisions.$inferSelect,
): PlanRevisionRow {
  return { ...row, data: PlanSchema.parse(row.data) }
}

function parseWorkoutSession(
  row: typeof schema.workoutSessions.$inferSelect,
): WorkoutSessionRow {
  return { ...row, data: WorkoutSessionSchema.parse(row.data) }
}

function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected database row')
  }

  return value
}
