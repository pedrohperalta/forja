import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

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

const listEquipmentPhotos = vi.fn()

vi.mock('@/server/services/photos/equipmentPhotoService', () => ({
  listEquipmentPhotos: (
    db: unknown,
    input: {
      userId: string
    },
  ) => listEquipmentPhotos(db, input),
}))

describe('GET /api/mobile/v1/photos/equipment', () => {
  afterEach(() => {
    listEquipmentPhotos.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment'),
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('lists photos for authenticated users', async () => {
    listEquipmentPhotos.mockResolvedValueOnce({
      photos: [
        {
          exerciseId: 'supino-reto',
          downloadUrl: '/api/mobile/v1/photos/equipment/supino-reto/download',
          updatedAt: '2026-05-18T12:00:00.000Z',
        },
      ],
    })

    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment', {
        headers: { authorization: 'Bearer valid-token', 'x-request-id': 'request-1' },
      }),
    )
    const body = (await response.json()) as { photos: { exerciseId: string }[] }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-1')
    expect(body.photos[0]?.exerciseId).toBe('supino-reto')
    expect(listEquipmentPhotos).toHaveBeenCalledWith({}, { userId: 'user-id' })
  })
})
