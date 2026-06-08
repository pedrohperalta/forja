import { afterEach, describe, expect, it, vi } from 'vitest'

import { ADMIN_SESSION_COOKIE } from '@/server/auth/adminAuth'
import { POST } from './route'

const getAdminUserFromSessionToken = vi.fn()
const createImportJob = vi.fn()
const extractWorkoutFromImage = vi.fn()

vi.mock('@/server/auth/adminAuth', () => ({
  ADMIN_SESSION_COOKIE: 'forja_admin_session',
  getAdminUserFromSessionToken: (
    input: Parameters<typeof getAdminUserFromSessionToken>[0],
  ) => getAdminUserFromSessionToken(input),
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

vi.mock('@/server/repositories', () => ({
  createImportJob: (
    db: unknown,
    input: Parameters<typeof createImportJob>[1],
  ) => createImportJob(db, input),
}))

vi.mock('@/server/services/import/workoutImportService', () => ({
  ImportServiceError: class ImportServiceError extends Error {
    constructor(
      message: string,
      readonly code: string,
    ) {
      super(message)
    }
  },
  extractWorkoutFromImage: (
    input: Parameters<typeof extractWorkoutFromImage>[0],
  ) => extractWorkoutFromImage(input),
  readImportEnv: () => ({
    ANTHROPIC_API_KEY: 'anthropic-secret',
    ANTHROPIC_MODEL: 'claude-sonnet-4-5',
  }),
}))

describe('POST /api/admin/import/extract-workout', () => {
  afterEach(() => {
    getAdminUserFromSessionToken.mockReset()
    createImportJob.mockReset()
    extractWorkoutFromImage.mockReset()
  })

  it('rejects unauthenticated admin requests', async () => {
    getAdminUserFromSessionToken.mockResolvedValueOnce(null)

    const response = await POST(importRequest({ authenticated: false }))
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
    expect(extractWorkoutFromImage).not.toHaveBeenCalled()
  })

  it('extracts workout data for authenticated admins and stores metadata only', async () => {
    getAdminUserFromSessionToken.mockResolvedValueOnce({
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin',
    })
    extractWorkoutFromImage.mockResolvedValueOnce({
      workout: {
        name: 'Treino A',
        exercises: [
          {
            name: 'Supino Reto',
            category: 'Peito',
            sets: 3,
            reps: '10-12',
            restSeconds: 60,
            equipment: 'Barra',
            confidence: 0.95,
          },
        ],
      },
    })

    const response = await POST(importRequest())
    const body = (await response.json()) as { workout: { name: string } }

    expect(response.status).toBe(200)
    expect(body.workout.name).toBe('Treino A')
    expect(createImportJob).toHaveBeenCalledWith(
      { db: true },
      expect.objectContaining({
        userId: 'admin-user-id',
        label: 'Ficha A',
        status: 'completed',
        completedAt: expect.any(Date),
      }),
    )
    expect(JSON.stringify(createImportJob.mock.calls)).not.toContain('raw-image')
    expect(JSON.stringify(createImportJob.mock.calls)).not.toContain('Supino Reto')
  })

  it('returns 422 when the model output is malformed', async () => {
    getAdminUserFromSessionToken.mockResolvedValueOnce({
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Admin',
    })
    extractWorkoutFromImage.mockRejectedValueOnce(
      new ErrorWithCode('Model output is invalid', 'model_output_invalid'),
    )

    const response = await POST(importRequest())
    const body = (await response.json()) as { error: { code: string } }

    expect(response.status).toBe(422)
    expect(body.error.code).toBe('model_output_invalid')
    expect(createImportJob).toHaveBeenCalledWith(
      { db: true },
      expect.objectContaining({
        userId: 'admin-user-id',
        label: 'Ficha A',
        status: 'failed',
        errorMessage: 'Model output is invalid',
      }),
    )
  })
})

function importRequest(options: { authenticated?: boolean } = {}): Request {
  const authenticated = options.authenticated ?? true
  const headers = new Headers({ 'content-type': 'application/json' })
  if (authenticated) {
    headers.set('cookie', `${ADMIN_SESSION_COOKIE}=admin-session-token`)
  }

  return new Request('https://forja.example.com/api/admin/import/extract-workout', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: 'raw-image',
      label: 'Ficha A',
    }),
  })
}

class ErrorWithCode extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message)
  }
}
