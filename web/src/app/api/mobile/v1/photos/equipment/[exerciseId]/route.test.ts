import { afterEach, describe, expect, it, vi } from 'vitest'

import { DELETE, PUT } from './route'

vi.mock('@/server/auth/defaultService', () => ({
  createDefaultMobileAuthService: () => ({
    getCurrentMobileUser: async ({
      authorization,
    }: {
      authorization: string | null
    }) => {
      if (authorization !== 'Bearer valid-token') {
        throw new Error('Unauthenticated')
      }

      return { id: 'user-id', email: 'user@example.com', name: 'User' }
    },
  }),
}))

vi.mock('@/server/db/client', () => ({
  getDatabase: () => ({}),
}))

const uploadEquipmentPhoto = vi.fn()
const deleteEquipmentPhoto = vi.fn()

vi.mock('@/server/services/photos/equipmentPhotoService', () => ({
  getUploadsDir: () => '/tmp/forja-uploads',
  PhotoServiceError: class PhotoServiceError extends Error {
    constructor(
      message: string,
      readonly code: string,
    ) {
      super(message)
    }
  },
  uploadEquipmentPhoto: (
    db: unknown,
    input: {
      userId: string
      exerciseId: string
      contentType: string
      bytes: Uint8Array
    },
  ) => uploadEquipmentPhoto(db, input),
  deleteEquipmentPhoto: (
    db: unknown,
    input: {
      userId: string
      exerciseId: string
    },
  ) => deleteEquipmentPhoto(db, input),
}))

describe('/api/mobile/v1/photos/equipment/[exerciseId]', () => {
  afterEach(() => {
    uploadEquipmentPhoto.mockReset()
    deleteEquipmentPhoto.mockReset()
  })

  it('rejects unauthenticated uploads', async () => {
    const response = await PUT(uploadRequest(), {
      params: Promise.resolve({ exerciseId: 'supino-reto' }),
    })
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('returns 415 for non-JPEG uploads', async () => {
    const response = await PUT(uploadRequest('image/png'), {
      params: Promise.resolve({ exerciseId: 'supino-reto' }),
    })
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(415)
    expect(body.error.code).toBe('unsupported_media_type')
  })

  it('uploads JPEG files for authenticated users', async () => {
    uploadEquipmentPhoto.mockResolvedValueOnce({
      exerciseId: 'supino-reto',
      path: 'equipment-photos/user-id/supino-reto.jpg',
      updatedAt: '2026-05-18T12:00:00.000Z',
    })

    const response = await PUT(
      uploadRequest('image/jpeg', new Uint8Array([0xff, 0xd8, 0xff, 0xdb])),
      { params: Promise.resolve({ exerciseId: 'supino-reto' }) },
    )
    const body = (await response.json()) as { path: string }

    expect(response.status).toBe(200)
    expect(body.path).toBe('equipment-photos/user-id/supino-reto.jpg')
    expect(uploadEquipmentPhoto).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user-id',
        exerciseId: 'supino-reto',
        contentType: 'image/jpeg',
        bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
      }),
    )
  })

  it('deletes idempotently for authenticated users', async () => {
    deleteEquipmentPhoto.mockResolvedValueOnce({ ok: true })

    const response = await DELETE(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment/supino-reto', {
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ exerciseId: 'supino-reto' }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })
})

function uploadRequest(
  contentType = 'image/jpeg',
  bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
): Request {
  const formData = new FormData()
  formData.set('file', new Blob([bytes], { type: contentType }), 'photo.jpg')

  return new Request('https://forja.example.com/api/mobile/v1/photos/equipment/supino-reto', {
    method: 'PUT',
    headers: { authorization: 'Bearer valid-token' },
    body: formData,
  })
}
