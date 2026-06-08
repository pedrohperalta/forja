import { afterEach, describe, expect, it } from 'vitest'

import { POST } from './route'

const ORIGINAL_ENV = process.env

describe('POST /api/mobile/v1/auth/google/start', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns a Google OAuth URL and propagates request ID', async () => {
    process.env = { ...ORIGINAL_ENV, ...validEnv() }
    const response = await POST(
      new Request('https://forja.example.com/api/mobile/v1/auth/google/start', {
        method: 'POST',
        headers: { 'x-request-id': 'request-1' },
        body: JSON.stringify({ redirectUri: 'forja://auth/callback' }),
      }),
    )
    const body = (await response.json()) as { url: string }

    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe('request-1')
    expect(new URL(body.url).origin).toBe('https://accounts.google.com')
  })

  it('returns a structured error for invalid redirect URIs', async () => {
    process.env = { ...ORIGINAL_ENV, ...validEnv() }
    const response = await POST(
      new Request('https://forja.example.com/api/mobile/v1/auth/google/start', {
        method: 'POST',
        body: JSON.stringify({ redirectUri: 'https://evil.example.com' }),
      }),
    )
    const body = (await response.json()) as {
      error: { code: string; requestId: string }
    }

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(body.error.requestId).toBeTruthy()
  })
})

function validEnv(): Record<string, string> {
  return {
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
}
