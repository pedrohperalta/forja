import { describe, expect, it } from 'vitest'

import { startAdminGoogleOAuth } from './adminAuth'

const env = {
  FORJA_PUBLIC_URL: 'https://forja.example.com',
  GOOGLE_CLIENT_ID: 'google-client-id',
  FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
}

describe('admin auth', () => {
  it('starts admin Google OAuth with signed admin state', () => {
    const result = startAdminGoogleOAuth({
      returnTo: '/admin',
      env,
      now: new Date('2026-05-18T12:00:00.000Z'),
      nonce: 'nonce',
    })
    const url = new URL(result.url)

    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('state')).toBe(result.state)
  })

  it('rejects cross-origin admin redirect targets', () => {
    expect(() =>
      startAdminGoogleOAuth({
        returnTo: 'https://evil.example.com/admin',
        env,
        now: new Date('2026-05-18T12:00:00.000Z'),
        nonce: 'nonce',
      }),
    ).toThrow(/Invalid admin redirect URI/)
  })
})
