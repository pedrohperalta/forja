import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { assertTestDatabaseUrl, resetDatabase } from '../db/testDatabase'
import { migrateDatabase } from '../db/migrate'
import * as schema from '../db/schema'
import { createMobileAuthService, startMobileGoogleOAuth } from './mobileAuth'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const NOW = new Date('2026-05-18T12:00:00.000Z')

const env = {
  FORJA_PUBLIC_URL: 'https://forja.example.com',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  FORJA_ALLOWED_USER_EMAILS: 'user@example.com',
  FORJA_ACCESS_TOKEN_SECRET: 'access-token-secret',
  FORJA_REFRESH_TOKEN_SECRET: 'refresh-token-secret',
  FORJA_AUTH_CODE_SECRET: 'auth-code-secret',
  FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
}

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('mobile auth service', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
  })

  afterAll(async () => {
    await client.end()
  })

  it('callback creates a user and exchange returns mobile tokens', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: 'https://example.com/avatar.jpg',
      }),
      randomToken: sequence('auth-code', 'refresh-token'),
      now: () => NOW,
    })
    const state = mobileState()

    const callback = await service.handleGoogleCallback({
      code: 'google-code',
      state,
    })
    const redirectUrl = new URL(callback.redirectUrl)
    const exchange = await service.exchangeMobileAuthCode({
      code: redirectUrl.searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })

    expect(callback.redirectUrl).toContain('forja://auth/callback')
    expect(exchange.user.email).toBe('user@example.com')
    expect(exchange.tokens.accessToken).toContain('.')
    expect(exchange.tokens.refreshToken).toBe('refresh-token')
  })

  it('callback links an existing Google account without duplicating users', async () => {
    const googleClient = fakeGoogleClient({
      id: 'google-user-id',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
    })
    const first = createMobileAuthService({
      db,
      env,
      googleClient,
      randomToken: sequence('first-code', 'first-refresh'),
      now: () => NOW,
    })
    const second = createMobileAuthService({
      db,
      env,
      googleClient,
      randomToken: sequence('second-code', 'second-refresh'),
      now: () => NOW,
    })

    const firstCallback = await first.handleGoogleCallback({
      code: 'google-code',
      state: mobileState(),
    })
    const firstExchange = await first.exchangeMobileAuthCode({
      code: new URL(firstCallback.redirectUrl).searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })
    const secondCallback = await second.handleGoogleCallback({
      code: 'google-code',
      state: mobileState(),
    })
    const secondExchange = await second.exchangeMobileAuthCode({
      code: new URL(secondCallback.redirectUrl).searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })

    expect(secondExchange.user.id).toBe(firstExchange.user.id)
  })

  it('rejects non-allowlisted Google accounts', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'other@example.com',
        name: 'Other',
        avatarUrl: null,
      }),
      randomToken: sequence('auth-code'),
      now: () => NOW,
    })

    await expect(
      service.handleGoogleCallback({ code: 'google-code', state: mobileState() }),
    ).rejects.toThrow(/not allowlisted/)
  })

  it('rejects invalid one-time codes', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
      }),
      randomToken: sequence('auth-code'),
      now: () => NOW,
    })

    await expect(
      service.exchangeMobileAuthCode({
        code: 'unknown-code',
        redirectUri: 'forja://auth/callback',
      }),
    ).rejects.toThrow(/Invalid auth code/)
  })

  it('rotates refresh tokens and prevents old-token reuse', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
      }),
      randomToken: sequence(
        'auth-code',
        'initial-refresh',
        'rotated-refresh',
      ),
      now: () => NOW,
    })
    const callback = await service.handleGoogleCallback({
      code: 'google-code',
      state: mobileState(),
    })
    const exchange = await service.exchangeMobileAuthCode({
      code: new URL(callback.redirectUrl).searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })

    const rotated = await service.refreshMobileTokens({
      refreshToken: exchange.tokens.refreshToken,
    })

    expect(rotated.refreshToken).toBe('rotated-refresh')
    await expect(
      service.refreshMobileTokens({ refreshToken: exchange.tokens.refreshToken }),
    ).rejects.toThrow(/Invalid refresh token/)
  })

  it('logout revokes refresh token idempotently', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
      }),
      randomToken: sequence('auth-code', 'refresh-token'),
      now: () => NOW,
    })
    const callback = await service.handleGoogleCallback({
      code: 'google-code',
      state: mobileState(),
    })
    const exchange = await service.exchangeMobileAuthCode({
      code: new URL(callback.redirectUrl).searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })

    await expect(
      service.logoutMobile({ refreshToken: exchange.tokens.refreshToken }),
    ).resolves.toEqual({ ok: true })
    await expect(
      service.logoutMobile({ refreshToken: exchange.tokens.refreshToken }),
    ).resolves.toEqual({ ok: true })
  })

  it('returns current user for a valid bearer token', async () => {
    const service = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient({
        id: 'google-user-id',
        email: 'user@example.com',
        name: 'User',
        avatarUrl: null,
      }),
      randomToken: sequence('auth-code', 'refresh-token'),
      now: () => NOW,
    })
    const callback = await service.handleGoogleCallback({
      code: 'google-code',
      state: mobileState(),
    })
    const exchange = await service.exchangeMobileAuthCode({
      code: new URL(callback.redirectUrl).searchParams.get('code') ?? '',
      redirectUri: 'forja://auth/callback',
    })

    const user = await service.getCurrentMobileUser({
      authorization: `Bearer ${exchange.tokens.accessToken}`,
    })

    expect(user.email).toBe('user@example.com')
  })
})

function mobileState(): string {
  return startMobileGoogleOAuth({
    redirectUri: 'forja://auth/callback',
    env,
    now: NOW,
    nonce: 'nonce',
  }).state
}

function sequence(...values: string[]): () => string {
  let index = 0

  return () => values[index++] ?? `fallback-${index}`
}

function fakeGoogleClient(profile: {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}): {
  getProfile: () => Promise<{
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }>
} {
  return {
    async getProfile() {
      return profile
    },
  }
}
