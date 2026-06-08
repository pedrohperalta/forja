import { z } from 'zod'

export const MUSCLE_CATEGORIES = [
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
] as const

export const IsoDateTimeSchema = z.string().datetime()
export const MuscleCategorySchema = z.enum(MUSCLE_CATEGORIES)
export const SyncStatusSchema = z.enum(['local', 'synced', 'pending'])

export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: MuscleCategorySchema,
  equipment: z.string(),
  reps: z.string().min(1),
  sets: z.number().int().min(1),
  restSeconds: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export const PlanSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  name: z.string().min(1),
  focus: z.string().min(1),
  exercises: z.array(ExerciseSchema),
  archived: z.boolean().optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export const CompletedExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1),
  weight: z.number(),
})

export const WorkoutSessionSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  planName: z.string().min(1),
  planLabel: z.string().min(1).optional(),
  focus: z.string().min(1),
  date: IsoDateTimeSchema,
  durationMinutes: z.number().min(0),
  exercises: z.array(CompletedExerciseSchema),
  syncStatus: SyncStatusSchema,
  version: z.number().int().min(1),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export const PublishedPlanChangeSchema = z.object({
  id: z.string().min(1),
  revisionId: z.string().min(1),
  data: PlanSchema,
  updatedAt: IsoDateTimeSchema,
})

export const WorkoutSessionChangeSchema = z.object({
  id: z.string().min(1),
  data: WorkoutSessionSchema,
  updatedAt: IsoDateTimeSchema,
})

export const SyncPullResponseSchema = z.object({
  cursor: z.string().min(1),
  hasMore: z.boolean(),
  plans: z.array(PublishedPlanChangeSchema),
  deletedPlanIds: z.array(z.string().min(1)),
  workoutSessions: z.array(WorkoutSessionChangeSchema),
  deletedWorkoutSessionIds: z.array(z.string().min(1)),
})

export const SyncPushWorkoutSessionSchema = z.object({
  id: z.string().min(1),
  data: WorkoutSessionSchema,
  updatedAt: IsoDateTimeSchema,
  deletedAt: IsoDateTimeSchema.nullable(),
})

export const SyncPushRequestSchema = z.object({
  workoutSessions: z.array(SyncPushWorkoutSessionSchema),
  clientMutationId: z.string().uuid(),
})

export const SyncPushResponseSchema = z.object({
  ok: z.literal(true),
  acceptedWorkoutSessionIds: z.array(z.string().min(1)),
  skippedWorkoutSessionIds: z.array(z.string().min(1)),
  currentWorkoutSessions: z.array(WorkoutSessionChangeSchema),
})

export const MobileAuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
})

export const MobileAuthTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: IsoDateTimeSchema,
})

export const MobileAuthGoogleStartRequestSchema = z.object({
  redirectUri: z.string().url(),
})

export const MobileAuthGoogleStartResponseSchema = z.object({
  url: z.string().url(),
})

export const MobileAuthExchangeRequestSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
})

export const MobileAuthExchangeResponseSchema = z.object({
  user: MobileAuthUserSchema,
  tokens: MobileAuthTokensSchema,
})

export const MobileAuthRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

export const MobileAuthRefreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: IsoDateTimeSchema,
})

export const OkResponseSchema = z.object({
  ok: z.literal(true),
})

export const EquipmentPhotoUploadResponseSchema = z.object({
  exerciseId: z.string().min(1),
  path: z.string().min(1),
  updatedAt: IsoDateTimeSchema,
})

export const EquipmentPhotoListItemSchema = z.object({
  exerciseId: z.string().min(1),
  downloadUrl: z.string().min(1),
  updatedAt: IsoDateTimeSchema,
})

export const EquipmentPhotoListResponseSchema = z.object({
  photos: z.array(EquipmentPhotoListItemSchema),
})

export const AdminImportExtractWorkoutRequestSchema = z.object({
  image: z.string().min(1),
  label: z.string().min(1),
})

export const AdminImportExtractedExerciseSchema = z.object({
  name: z.string().min(1),
  category: MuscleCategorySchema,
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1),
  restSeconds: z.number().int().min(0).max(600),
  equipment: z.string(),
  confidence: z.number().min(0).max(1),
})

export const AdminImportExtractedWorkoutSchema = z.object({
  name: z.string().min(1),
  exercises: z.array(AdminImportExtractedExerciseSchema).min(1),
})

export const AdminImportExtractWorkoutResponseSchema = z.object({
  workout: AdminImportExtractedWorkoutSchema,
})

export type MuscleCategory = z.infer<typeof MuscleCategorySchema>
export type SyncStatus = z.infer<typeof SyncStatusSchema>
export type Exercise = z.infer<typeof ExerciseSchema>
export type Plan = z.infer<typeof PlanSchema>
export type CompletedExercise = z.infer<typeof CompletedExerciseSchema>
export type WorkoutSession = z.infer<typeof WorkoutSessionSchema>
export type PublishedPlanChange = z.infer<typeof PublishedPlanChangeSchema>
export type WorkoutSessionChange = z.infer<typeof WorkoutSessionChangeSchema>
export type SyncPullResponse = z.infer<typeof SyncPullResponseSchema>
export type SyncPushWorkoutSession = z.infer<
  typeof SyncPushWorkoutSessionSchema
>
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>
export type SyncPushResponse = z.infer<typeof SyncPushResponseSchema>
export type MobileAuthUser = z.infer<typeof MobileAuthUserSchema>
export type MobileAuthTokens = z.infer<typeof MobileAuthTokensSchema>
export type MobileAuthGoogleStartRequest = z.infer<
  typeof MobileAuthGoogleStartRequestSchema
>
export type MobileAuthGoogleStartResponse = z.infer<
  typeof MobileAuthGoogleStartResponseSchema
>
export type MobileAuthExchangeRequest = z.infer<
  typeof MobileAuthExchangeRequestSchema
>
export type MobileAuthExchangeResponse = z.infer<
  typeof MobileAuthExchangeResponseSchema
>
export type MobileAuthRefreshRequest = z.infer<
  typeof MobileAuthRefreshRequestSchema
>
export type MobileAuthRefreshResponse = z.infer<
  typeof MobileAuthRefreshResponseSchema
>
export type OkResponse = z.infer<typeof OkResponseSchema>
export type EquipmentPhotoUploadResponse = z.infer<
  typeof EquipmentPhotoUploadResponseSchema
>
export type EquipmentPhotoListItem = z.infer<
  typeof EquipmentPhotoListItemSchema
>
export type EquipmentPhotoListResponse = z.infer<
  typeof EquipmentPhotoListResponseSchema
>
export type AdminImportExtractWorkoutRequest = z.infer<
  typeof AdminImportExtractWorkoutRequestSchema
>
export type AdminImportExtractedExercise = z.infer<
  typeof AdminImportExtractedExerciseSchema
>
export type AdminImportExtractedWorkout = z.infer<
  typeof AdminImportExtractedWorkoutSchema
>
export type AdminImportExtractWorkoutResponse = z.infer<
  typeof AdminImportExtractWorkoutResponseSchema
>
