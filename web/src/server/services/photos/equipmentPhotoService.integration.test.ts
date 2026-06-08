import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { migrateDatabase } from '../../db/migrate'
import * as schema from '../../db/schema'
import { assertTestDatabaseUrl, resetDatabase } from '../../db/testDatabase'
import { createUser } from '../../repositories'
import {
  deleteEquipmentPhoto,
  downloadEquipmentPhoto,
  listEquipmentPhotos,
  uploadEquipmentPhoto,
} from './equipmentPhotoService'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const USER_ID = '0a9d699f-c75f-4a55-a924-79a607f2f420'
const OTHER_USER_ID = '60adcf44-f0f4-4c53-9dbc-26401302c84c'
const NOW = new Date('2026-05-18T12:00:00.000Z')
const LATER = new Date('2026-05-18T13:00:00.000Z')
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43])
const INVALID_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })
let uploadsDir = ''

describe('equipment photo service', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
    if (uploadsDir) {
      await rm(uploadsDir, { recursive: true, force: true })
    }
    uploadsDir = await mkdtemp(join(tmpdir(), 'forja-photos-'))
    await createUser(db, {
      id: USER_ID,
      email: 'user@example.com',
      name: 'User',
      now: NOW,
    })
    await createUser(db, {
      id: OTHER_USER_ID,
      email: 'other@example.com',
      name: 'Other',
      now: NOW,
    })
  })

  afterAll(async () => {
    await rm(uploadsDir, { recursive: true, force: true })
    await client.end()
  })

  it('rejects non-JPEG content types and invalid JPEG magic bytes', async () => {
    await expect(
      uploadEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
        contentType: 'image/png',
        bytes: JPEG_BYTES,
        now: NOW,
      }),
    ).rejects.toThrow(/JPEG/)

    await expect(
      uploadEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
        contentType: 'image/jpeg',
        bytes: INVALID_BYTES,
        now: NOW,
      }),
    ).rejects.toThrow(/JPEG/)
  })

  it('rejects files over 5 MB', async () => {
    const tooLarge = new Uint8Array(5 * 1024 * 1024 + 1)
    tooLarge.set(JPEG_BYTES)

    await expect(
      uploadEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
        contentType: 'image/jpeg',
        bytes: tooLarge,
        now: NOW,
      }),
    ).rejects.toThrow(/5 MB/)
  })

  it('stores under the authenticated user folder using a stable path', async () => {
    const uploaded = await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: JPEG_BYTES,
      now: NOW,
    })
    const storedBytes = await readFile(join(uploadsDir, uploaded.path))

    expect(uploaded).toEqual({
      exerciseId: 'supino-reto',
      path: `equipment-photos/${USER_ID}/supino-reto.jpg`,
      updatedAt: NOW.toISOString(),
    })
    expect([...storedBytes]).toEqual([...JPEG_BYTES])
  })

  it('re-upload clears deletedAt and keeps the stable path', async () => {
    await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: JPEG_BYTES,
      now: NOW,
    })
    await deleteEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      now: LATER,
    })

    const uploadedAgain = await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      now: LATER,
    })
    const photos = await listEquipmentPhotos(db, { userId: USER_ID })

    expect(uploadedAgain.path).toBe(`equipment-photos/${USER_ID}/supino-reto.jpg`)
    expect(photos.photos).toEqual([
      {
        exerciseId: 'supino-reto',
        downloadUrl: '/api/mobile/v1/photos/equipment/supino-reto/download',
        updatedAt: LATER.toISOString(),
      },
    ])
  })

  it('lists and downloads only the current user active photos', async () => {
    await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: JPEG_BYTES,
      now: NOW,
    })
    await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: OTHER_USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      now: LATER,
    })

    const photos = await listEquipmentPhotos(db, { userId: USER_ID })
    const download = await downloadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
    })

    expect(photos.photos).toHaveLength(1)
    expect(download?.contentType).toBe('image/jpeg')
    expect(download?.bytes).toEqual(JPEG_BYTES)
  })

  it('delete is idempotent and keeps the physical file on disk', async () => {
    const uploaded = await uploadEquipmentPhoto(db, {
      uploadsDir,
      userId: USER_ID,
      exerciseId: 'supino-reto',
      contentType: 'image/jpeg',
      bytes: JPEG_BYTES,
      now: NOW,
    })

    await expect(
      deleteEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
        now: LATER,
      }),
    ).resolves.toEqual({ ok: true })
    await expect(
      deleteEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
        now: LATER,
      }),
    ).resolves.toEqual({ ok: true })

    await expect(stat(join(uploadsDir, uploaded.path))).resolves.toMatchObject({
      size: JPEG_BYTES.byteLength,
    })
    await expect(
      downloadEquipmentPhoto(db, {
        uploadsDir,
        userId: USER_ID,
        exerciseId: 'supino-reto',
      }),
    ).resolves.toBeNull()
  })
})
