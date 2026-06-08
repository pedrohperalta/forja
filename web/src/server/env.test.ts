import { afterEach, describe, expect, it } from 'vitest'

import { readServerEnv } from './env'

const ORIGINAL_ENV = process.env

const validEnv = {
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

describe('server env validation', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it('returns validated server env values', () => {
    process.env = { ...ORIGINAL_ENV, ...validEnv }

    expect(readServerEnv().FORJA_PUBLIC_URL).toBe(validEnv.FORJA_PUBLIC_URL)
  })

  it('fails fast when required env vars are missing', () => {
    process.env = { ...ORIGINAL_ENV }
    for (const key of Object.keys(validEnv)) {
      delete process.env[key]
    }

    expect(() => readServerEnv()).toThrow(/Invalid server environment/)
  })
})
