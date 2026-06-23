import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

import { invalidCursor, unauthenticated } from '@/server/http/appError'

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

vi.mock('@/server/env', () => ({
  readServerEnv: () => ({ FORJA_SYNC_CURSOR_SECRET: 'sync-cursor-secret' }),
}))

const pullPlanChanges = vi.fn()

vi.mock('@/server/services/sync/planPullService', () => ({
  pullPlanChanges: (
    db: unknown,
    input: {
      userId: string
      cursor: string | null
      cursorSecret: string
    },
  ) => pullPlanChanges(db, input),
}))

describe('GET /api/mobile/v1/sync/pull', () => {
  afterEach(() => {
    pullPlanChanges.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await GET(new Request('https://forja.example.com/api/mobile/v1/sync/pull'))
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('returns 400 for invalid cursors', async () => {
    pullPlanChanges.mockRejectedValueOnce(invalidCursor('Invalid cursor'))

    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/sync/pull?cursor=bad', {
        headers: { authorization: 'Bearer valid-token' },
      }),
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid_cursor')
  })

  it('returns a validated pull response for authenticated users', async () => {
    pullPlanChanges.mockResolvedValueOnce({
      cursor: 'next-cursor',
      hasMore: false,
      plans: [],
      deletedPlanIds: [],
      workoutSessions: [],
      deletedWorkoutSessionIds: [],
    })

    const response = await GET(
      new Request('https://forja.example.com/api/mobile/v1/sync/pull', {
        headers: {
          authorization: 'Bearer valid-token',
          'x-request-id': 'request-1',
        },
      }),
    )
    const body = (await response.json()) as { cursor: string }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-1')
    expect(body.cursor).toBe('next-cursor')
    expect(pullPlanChanges).toHaveBeenCalledWith(
      {},
      {
        userId: 'user-id',
        cursor: null,
        cursorSecret: 'sync-cursor-secret',
      },
    )
  })
})
