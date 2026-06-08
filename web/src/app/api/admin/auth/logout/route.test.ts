import { afterEach, describe, expect, it } from 'vitest'

import { ADMIN_SESSION_COOKIE } from '@/server/auth/adminAuth'
import { POST } from './route'

const ORIGINAL_ENV = process.env

describe('POST /api/admin/auth/logout', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('clears the admin session cookie idempotently', async () => {
    process.env = {
      ...ORIGINAL_ENV,
      FORJA_PUBLIC_URL: 'https://forja.example.com',
      DATABASE_URL: 'postgres://forja:secret@localhost:5432/forja',
      GOOGLE_CLIENT_ID: 'google-client-id',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
      FORJA_ALLOWED_USER_EMAILS: 'admin@example.com',
      FORJA_ADMIN_EMAILS: 'admin@example.com',
      FORJA_ACCESS_TOKEN_SECRET: 'access-secret',
      FORJA_REFRESH_TOKEN_SECRET: 'refresh-secret',
      FORJA_ADMIN_SESSION_SECRET: 'admin-session-secret',
      FORJA_AUTH_CODE_SECRET: 'auth-code-secret',
      FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
      FORJA_SYNC_CURSOR_SECRET: 'sync-cursor-secret',
    }

    const response = await POST(
      new Request('https://forja.example.com/api/admin/auth/logout', {
        method: 'POST',
      }),
    )
    const body = (await response.json()) as { ok: true }

    expect(body).toEqual({ ok: true })
    expect(response.headers.get('set-cookie')).toContain(ADMIN_SESSION_COOKIE)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})
