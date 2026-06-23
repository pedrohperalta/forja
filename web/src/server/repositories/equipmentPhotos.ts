import { and, asc, eq, isNull } from 'drizzle-orm'

import * as schema from '../db/schema'
import { required, type Database, type EquipmentPhotoRow } from './types'

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
    .where(and(eq(schema.equipmentPhotos.userId, userId), isNull(schema.equipmentPhotos.deletedAt)))
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
