import { describe, expect, it, vi, afterEach } from 'vitest'

import { ADMIN_SESSION_COOKIE } from '@/server/auth/adminAuth'
import { POST } from './route'

const getAdminUserFromSessionToken = vi.fn()
const createDraftPlan = vi.fn()

vi.mock('node:crypto', () => ({
  randomUUID: () => 'stable-uuid',
}))

vi.mock('@/server/auth/adminAuth', () => ({
  ADMIN_SESSION_COOKIE: 'forja_admin_session',
  getAdminUserFromSessionToken: (input: Parameters<typeof getAdminUserFromSessionToken>[0]) =>
    getAdminUserFromSessionToken(input),
}))

vi.mock('@/server/db/client', () => ({
  getDatabase: () => ({ db: true }),
}))

vi.mock('@/server/env', () => ({
  readServerEnv: () => ({
    FORJA_ADMIN_EMAILS: 'admin@example.com',
    FORJA_ADMIN_SESSION_SECRET: 'admin-session-secret',
  }),
}))

vi.mock('@/server/services/plans/planService', () => ({
  createDraftPlan: (db: unknown, input: Parameters<typeof createDraftPlan>[1]) =>
    createDraftPlan(db, input),
}))

describe('POST /api/admin/import/create-plan', () => {
  afterEach(() => {
    getAdminUserFromSessionToken.mockReset()
    createDraftPlan.mockReset()
  })

  it('creates a draft plan from an extracted workout', async () => {
    getAdminUserFromSessionToken.mockResolvedValueOnce({
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin',
    })
    createDraftPlan.mockResolvedValueOnce({ planId: 'plan_treino_3' })

    const response = await POST(importCreatePlanRequest())
    const body = (await response.json()) as { planId: string }

    expect(response.status).toBe(200)
    expect(body.planId).toBe('plan_treino_3')
    expect(createDraftPlan).toHaveBeenCalledWith(
      { db: true },
      expect.objectContaining({
        focus: 'Costas',
        label: 'Treino 3',
        name: 'Treino 3',
        planId: 'plan_treino_3',
        userId: 'admin-user-id',
        exercises: [
          expect.objectContaining({
            category: 'Costas',
            equipment: 'Barra',
            id: 'exercise_stable-uuid_0',
            name: 'Dead Hang',
            reps: '6-10',
            restSeconds: 60,
            sets: 2,
          }),
        ],
      }),
    )
  })

  it('rejects unauthenticated requests', async () => {
    getAdminUserFromSessionToken.mockResolvedValueOnce(null)

    const response = await POST(importCreatePlanRequest({ authenticated: false }))
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
    expect(createDraftPlan).not.toHaveBeenCalled()
  })
})

function importCreatePlanRequest(options: { authenticated?: boolean } = {}): Request {
  const authenticated = options.authenticated ?? true
  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/json',
  })
  if (authenticated) {
    headers.set('cookie', `${ADMIN_SESSION_COOKIE}=admin-session-token`)
  }

  return new Request('https://forja.example.com/api/admin/import/create-plan', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      workout: {
        name: 'Treino 3',
        exercises: [
          {
            name: 'Dead Hang',
            category: 'Costas',
            sets: 2,
            reps: '6-10',
            restSeconds: 60,
            equipment: 'Barra',
            confidence: 0.85,
          },
        ],
      },
    }),
  })
}
