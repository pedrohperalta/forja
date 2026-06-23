import { afterEach, describe, expect, it, vi } from 'vitest'

import { DELETE } from './route'

import { unauthenticated } from '@/server/http/appError'

vi.mock('@/server/auth/defaultService', () => ({
  createDefaultMobileAuthService: () => ({
    getCurrentMobileUser: async ({ authorization }: { authorization: string | null }) => {
      if (authorization !== 'Bearer valid-token') {
        throw unauthenticated('Unauthenticated')
      }

      return { id: 'user-id', email: 'user@example.com', name: 'User' }
    },
  }),
}))

vi.mock('@/server/db/client', () => ({
  getDatabase: () => ({}),
}))

const deleteWorkoutSession = vi.fn()

vi.mock('@/server/services/sync/workoutPushService', () => ({
  deleteWorkoutSession: (
    db: unknown,
    input: {
      userId: string
      sessionId: string
      now: Date
    },
  ) => deleteWorkoutSession(db, input),
}))

describe('DELETE /api/mobile/v1/workout-sessions/[sessionId]', () => {
  afterEach(() => {
    deleteWorkoutSession.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await DELETE(
      new Request('https://forja.example.com/api/mobile/v1/workout-sessions/s1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ sessionId: 's1' }) },
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('creates a scoped tombstone for authenticated users', async () => {
    deleteWorkoutSession.mockResolvedValueOnce({ ok: true })

    const response = await DELETE(
      new Request('https://forja.example.com/api/mobile/v1/workout-sessions/s1', {
        method: 'DELETE',
        headers: {
          authorization: 'Bearer valid-token',
          'x-request-id': 'request-1',
        },
      }),
      { params: Promise.resolve({ sessionId: 's1' }) },
    )
    const body = (await response.json()) as { ok: true }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-1')
    expect(body).toEqual({ ok: true })
    expect(deleteWorkoutSession).toHaveBeenCalledWith(
      {},
      {
        userId: 'user-id',
        sessionId: 's1',
        now: expect.any(Date),
      },
    )
  })
})
