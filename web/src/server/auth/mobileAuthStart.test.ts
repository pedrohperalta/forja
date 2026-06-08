import { describe, expect, it } from 'vitest'

import { startMobileGoogleOAuth } from './mobileAuth'

const env = {
  FORJA_PUBLIC_URL: 'https://forja.example.com',
  GOOGLE_CLIENT_ID: 'google-client-id',
  FORJA_OAUTH_STATE_SECRET: 'oauth-state-secret',
}

describe('mobile Google OAuth start', () => {
  it('returns a Google OAuth URL', () => {
    const result = startMobileGoogleOAuth({
      redirectUri: 'forja://auth/callback',
      env,
      now: new Date('2026-05-18T12:00:00.000Z'),
      nonce: 'nonce',
    })

    const url = new URL(result.url)
    expect(url.origin).toBe('https://accounts.google.com')
    expect(url.searchParams.get('client_id')).toBe('google-client-id')
    expect(url.searchParams.get('state')).toBeTruthy()
  })

  it('rejects invalid mobile redirect URIs', () => {
    expect(() =>
      startMobileGoogleOAuth({
        redirectUri: 'https://evil.example.com/callback',
        env,
        now: new Date('2026-05-18T12:00:00.000Z'),
        nonce: 'nonce',
      }),
    ).toThrow(/Invalid mobile redirect URI/)
  })
})
