import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { PlanSchema, WorkoutSessionSchema, type Plan, type WorkoutSession } from '@forja/domain'
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

export function parsePlanDraft(row: typeof schema.planDrafts.$inferSelect): PlanDraftRow {
  return { ...row, data: PlanSchema.parse(row.data) }
}

export function parsePlanRevision(row: typeof schema.planRevisions.$inferSelect): PlanRevisionRow {
  return { ...row, data: PlanSchema.parse(row.data) }
}

export function parseWorkoutSession(
  row: typeof schema.workoutSessions.$inferSelect,
): WorkoutSessionRow {
  return { ...row, data: WorkoutSessionSchema.parse(row.data) }
}

export function required<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Expected database row')
  }

  return value
}
