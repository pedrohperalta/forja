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

const downloadEquipmentPhoto = vi.fn()

vi.mock('@/server/services/photos/equipmentPhotoService', () => ({
  getUploadsDir: () => '/tmp/forja-uploads',
  downloadEquipmentPhoto: (
    db: unknown,
    input: {
      userId: string
      exerciseId: string
    },
  ) => downloadEquipmentPhoto(db, input),
}))

describe('GET /api/mobile/v1/photos/equipment/[exerciseId]/download', () => {
  afterEach(() => {
    downloadEquipmentPhoto.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment/supino/download'),
      { params: Promise.resolve({ exerciseId: 'supino-reto' }) },
    )

    expect(response.status).toBe(401)
  })

  it('returns 404 when absent', async () => {
    downloadEquipmentPhoto.mockResolvedValueOnce(null)

    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment/supino/download', {
        headers: { authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ exerciseId: 'supino-reto' }) },
    )

    expect(response.status).toBe(404)
  })

  it('downloads JPEG bytes', async () => {
    downloadEquipmentPhoto.mockResolvedValueOnce({
      contentType: 'image/jpeg',
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xdb]),
    })

    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/photos/equipment/supino/download', {
        headers: { authorization: 'Bearer valid-token' },
      }),
      { params: Promise.resolve({ exerciseId: 'supino-reto' }) },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([
      0xff, 0xd8, 0xff, 0xdb,
    ])
  })
})
