import { join } from 'node:path'

import {
  EquipmentPhotoListResponseSchema,
  EquipmentPhotoUploadResponseSchema,
  OkResponseSchema,
  type EquipmentPhotoListResponse,
  type EquipmentPhotoUploadResponse,
  type OkResponse,
} from '@forja/domain'
import {
  createOrUpdateEquipmentPhoto,
  findActiveEquipmentPhoto,
  listActiveEquipmentPhotos,
  markEquipmentPhotoDeleted,
  type Database,
} from '../../repositories'
import { readLocalFile, writeLocalFile } from '../../storage/localFileStorage'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const JPEG_CONTENT_TYPE = 'image/jpeg'

export type UploadEquipmentPhotoInput = {
  uploadsDir: string
  userId: string
  exerciseId: string
  contentType: string
  bytes: Uint8Array
  now: Date
}

export type ListEquipmentPhotosInput = {
  userId: string
}

export type DownloadEquipmentPhotoInput = {
  uploadsDir: string
  userId: string
  exerciseId: string
}

export type DownloadEquipmentPhotoResult = {
  contentType: 'image/jpeg'
  bytes: Uint8Array
}

export type DeleteEquipmentPhotoInput = {
  uploadsDir: string
  userId: string
  exerciseId: string
  now: Date
}

export class PhotoServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported_media_type' | 'upload_too_large' | 'not_found',
  ) {
    super(message)
  }
}

export function getUploadsDir(): string {
  return process.env.UPLOADS_DIR || join(process.cwd(), '.uploads')
}

export async function uploadEquipmentPhoto(
  db: Database,
  input: UploadEquipmentPhotoInput,
): Promise<EquipmentPhotoUploadResponse> {
  assertJpeg(input.contentType, input.bytes)
  const path = stableEquipmentPhotoPath(input.userId, input.exerciseId)

  await writeLocalFile({
    rootDir: input.uploadsDir,
    relativePath: path,
    bytes: input.bytes,
  })

  const photo = await createOrUpdateEquipmentPhoto(db, {
    userId: input.userId,
    exerciseId: input.exerciseId,
    path,
    contentType: JPEG_CONTENT_TYPE,
    byteSize: input.bytes.byteLength,
    now: input.now,
  })

  return EquipmentPhotoUploadResponseSchema.parse({
    exerciseId: photo.exerciseId,
    path: photo.path,
    updatedAt: photo.updatedAt.toISOString(),
  })
}

export async function listEquipmentPhotos(
  db: Database,
  input: ListEquipmentPhotosInput,
): Promise<EquipmentPhotoListResponse> {
  const photos = await listActiveEquipmentPhotos(db, input.userId)

  return EquipmentPhotoListResponseSchema.parse({
    photos: photos.map((photo) => ({
      exerciseId: photo.exerciseId,
      downloadUrl: `/api/mobile/v1/photos/equipment/${encodeURIComponent(
        photo.exerciseId,
      )}/download`,
      updatedAt: photo.updatedAt.toISOString(),
    })),
  })
}

export async function downloadEquipmentPhoto(
  db: Database,
  input: DownloadEquipmentPhotoInput,
): Promise<DownloadEquipmentPhotoResult | null> {
  const photo = await findActiveEquipmentPhoto(db, input.userId, input.exerciseId)

  if (!photo) {
    return null
  }

  const bytes = await readLocalFile(input.uploadsDir, photo.path)

  return { contentType: JPEG_CONTENT_TYPE, bytes }
}

export async function deleteEquipmentPhoto(
  db: Database,
  input: DeleteEquipmentPhotoInput,
): Promise<OkResponse> {
  await markEquipmentPhotoDeleted(db, input.userId, input.exerciseId, input.now)

  return OkResponseSchema.parse({ ok: true })
}

function assertJpeg(contentType: string, bytes: Uint8Array): void {
  if (contentType !== JPEG_CONTENT_TYPE) {
    throw new PhotoServiceError('Only JPEG uploads are supported', 'unsupported_media_type')
  }

  if (bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new PhotoServiceError('Photo uploads must be 5 MB or smaller', 'upload_too_large')
  }

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw new PhotoServiceError('Invalid JPEG file', 'unsupported_media_type')
  }
}

function stableEquipmentPhotoPath(userId: string, exerciseId: string): string {
  return `equipment-photos/${encodeURIComponent(userId)}/${encodeURIComponent(
    exerciseId,
  )}.jpg`
}
