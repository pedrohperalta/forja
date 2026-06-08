import { afterEach, describe, expect, it } from 'vitest'

import { GET } from './route'

const ORIGINAL_ENV = process.env

describe('GET /api/auth/google/callback', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('rejects invalid OAuth state with a structured error', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      FORJA_PUBLIC_URL: 'https://forja.example.com',
      DATABASE_URL: 'postgres://forja:secret@localhost:5432/forja',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      FORJA_ALLOWED_USER_EMAILS: 'user@example.com',
      FORJA_ADMIN_EMAILS: 'admin@example.com',
      FORJA_ACCESS_TOKEN_SECRET: 'access-secret',
      FORJA_REFRESH_TOKEN_SECRET: 'refresh-secret',
      FORJA_ADMIN_SESSION_SECRET: 'admin-session-secret',
      FORJA_AUTH_CODE_SECRET: 'auth-code-secret',
      FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
      FORJA_SYNC_CURSOR_SECRET: 'sync-cursor-secret',
    }

    const response = await GET(
      new Request(
        'https://forja.example.com/api/auth/google/callback?code=google-code&state=tampered',
        { headers: { 'x-request-id': 'callback-request' } },
      ),
    )
    const body = (await response.json()) as {
      error: { code: string; requestId: string }
    }

    expect(response.status).toBe(401)
    expect(response.headers.get('x-request-id')).toBe('callback-request')
    expect(body.error.code).toBe('oauth_error')
    expect(body.error.requestId).toBe('callback-request')
  })
})
