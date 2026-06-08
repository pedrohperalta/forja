import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

import { assertTestDatabaseUrl, resetDatabase } from '../db/testDatabase'
import { migrateDatabase } from '../db/migrate'
import * as schema from '../db/schema'
import { findAdminSessionByHash } from '../repositories'
import { hmacSha256 } from './crypto'
import { createMobileAuthService } from './mobileAuth'
import {
  getAdminUserFromSessionToken,
  logoutAdminSession,
  startAdminGoogleOAuth,
} from './adminAuth'

const TEST_DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)
const NOW = new Date('2026-05-18T12:00:00.000Z')

const env = {
  FORJA_PUBLIC_URL: 'https://forja.example.com',
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  FORJA_ALLOWED_USER_EMAILS: 'admin@example.com',
  FORJA_ADMIN_EMAILS: 'admin@example.com',
  FORJA_ACCESS_TOKEN_SECRET: 'access-token-secret',
  FORJA_REFRESH_TOKEN_SECRET: 'refresh-token-secret',
  FORJA_ADMIN_SESSION_SECRET: 'admin-session-secret',
  FORJA_AUTH_CODE_SECRET: 'auth-code-secret',
  FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
}

const client = postgres(TEST_DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

describe('admin auth integration', () => {
  beforeAll(async () => {
    await migrateDatabase(client)
  })

  beforeEach(async () => {
    await resetDatabase(client)
  })

  afterAll(async () => {
    await client.end()
  })

  it('stores admin sessions hashed and resolves authenticated admin users', async () => {
    const authService = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient(),
      randomToken: () => 'admin-session-token',
      now: () => NOW,
    })
    const state = startAdminGoogleOAuth({
      returnTo: '/admin',
      env,
      now: NOW,
      nonce: 'nonce',
    }).state

    const callback = await authService.handleGoogleCallback({
      code: 'google-code',
      state,
    })
    const rawSession = await findAdminSessionByHash(db, 'admin-session-token')
    const hashedSession = await findAdminSessionByHash(
      db,
      hmacSha256('admin-session-token', env.FORJA_ADMIN_SESSION_SECRET),
    )
    const user = await getAdminUserFromSessionToken({
      db,
      env,
      sessionToken: 'admin-session-token',
      now: NOW,
    })

    expect(callback.adminSessionToken).toBe('admin-session-token')
    expect(rawSession).toBeNull()
    expect(hashedSession?.sessionHash).toBeTruthy()
    expect(user?.email).toBe('admin@example.com')
  })

  it('returns null for unauthenticated admin requests and revokes logout', async () => {
    const authService = createMobileAuthService({
      db,
      env,
      googleClient: fakeGoogleClient(),
      randomToken: () => 'admin-session-token',
      now: () => NOW,
    })
    const state = startAdminGoogleOAuth({
      returnTo: '/admin',
      env,
      now: NOW,
      nonce: 'nonce',
    }).state

    await authService.handleGoogleCallback({ code: 'google-code', state })
    await logoutAdminSession({
      db,
      env,
      sessionToken: 'admin-session-token',
      now: NOW,
    })

    await expect(
      getAdminUserFromSessionToken({ db, env, sessionToken: null, now: NOW }),
    ).resolves.toBeNull()
    await expect(
      getAdminUserFromSessionToken({
        db,
        env,
        sessionToken: 'admin-session-token',
        now: NOW,
      }),
    ).resolves.toBeNull()
  })
})

function fakeGoogleClient(): {
  getProfile: () => Promise<{
    id: string
    email: string
    name: string
    avatarUrl: string | null
  }>
} {
  return {
    async getProfile() {
      return {
        id: 'google-admin-id',
        email: 'admin@example.com',
        name: 'Admin',
        avatarUrl: null,
      }
    },
  }
}
