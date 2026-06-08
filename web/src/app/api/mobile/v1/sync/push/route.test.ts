import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './route'

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

const pushWorkoutSessions = vi.fn()

vi.mock('@/server/services/sync/workoutPushService', () => ({
  pushWorkoutSessions: (
    db: unknown,
    input: {
      userId: string
      request: unknown
    },
  ) => pushWorkoutSessions(db, input),
}))

describe('POST /api/mobile/v1/sync/push', () => {
  afterEach(() => {
    pushWorkoutSessions.mockReset()
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await POST(
      new Request('https://forja.example.com/api/mobile/v1/sync/push', {
        method: 'POST',
        body: JSON.stringify(validPushBody()),
      }),
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
  })

  it('returns 422 for invalid session data', async () => {
    const response = await POST(
      new Request('https://forja.example.com/api/mobile/v1/sync/push', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: JSON.stringify({ workoutSessions: [], clientMutationId: 'bad' }),
      }),
    )
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('validation_error')
  })

  it('pushes sessions for authenticated users', async () => {
    pushWorkoutSessions.mockResolvedValueOnce({
      ok: true,
      acceptedWorkoutSessionIds: ['session_1'],
      skippedWorkoutSessionIds: [],
      currentWorkoutSessions: [],
    })

    const response = await POST(
      new Request('https://forja.example.com/api/mobile/v1/sync/push', {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'x-request-id': 'request-1',
        },
        body: JSON.stringify(validPushBody()),
      }),
    )
    const body = (await response.json()) as { acceptedWorkoutSessionIds: string[] }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-1')
    expect(body.acceptedWorkoutSessionIds).toEqual(['session_1'])
    expect(pushWorkoutSessions).toHaveBeenCalledWith(
      {},
      {
        userId: 'user-id',
        request: validPushBody(),
      },
    )
  })
})

function validPushBody(): unknown {
  return {
    workoutSessions: [
      {
        id: 'session_1',
        data: {
          id: 'session_1',
          planId: 'plan_a',
          planName: 'Treino A',
          planLabel: 'A',
          focus: 'Peito / Ombros',
          date: '2026-05-18T12:00:00.000Z',
          durationMinutes: 42,
          exercises: [{ name: 'Supino Reto', sets: 3, weight: 80 }],
          syncStatus: 'pending',
          version: 1,
          createdAt: '2026-05-18T12:00:00.000Z',
          updatedAt: '2026-05-18T12:00:00.000Z',
        },
        updatedAt: '2026-05-18T12:00:00.000Z',
        deletedAt: null,
      },
    ],
    clientMutationId: '7a071858-1a4b-489f-a8cf-bd04f1f8b10f',
  }
}
