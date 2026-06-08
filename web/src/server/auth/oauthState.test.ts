import { describe, expect, it } from 'vitest'

import { signOAuthState, verifyOAuthState } from './oauthState'

const secret = 'oauth-state-secret'
const now = new Date('2026-05-18T12:00:00.000Z')

describe('OAuth state', () => {
  it('round-trips signed mobile state', () => {
    const state = signOAuthState({
      payload: {
        flow: 'mobile',
        redirectUri: 'forja://auth/callback',
        nonce: 'nonce',
        expiresAt: new Date('2026-05-18T12:10:00.000Z').toISOString(),
      },
      secret,
    })

    expect(verifyOAuthState({ state, secret, now })).toMatchObject({
      flow: 'mobile',
      redirectUri: 'forja://auth/callback',
    })
  })

  it('rejects tampered state', () => {
    const state = signOAuthState({
      payload: {
        flow: 'mobile',
        redirectUri: 'forja://auth/callback',
        nonce: 'nonce',
        expiresAt: new Date('2026-05-18T12:10:00.000Z').toISOString(),
      },
      secret,
    })

    expect(() =>
      verifyOAuthState({ state: `${state}x`, secret, now }),
    ).toThrow(/Invalid OAuth state/)
  })

  it('rejects expired state', () => {
    const state = signOAuthState({
      payload: {
        flow: 'mobile',
        redirectUri: 'forja://auth/callback',
        nonce: 'nonce',
        expiresAt: new Date('2026-05-18T11:59:00.000Z').toISOString(),
      },
      secret,
    })

    expect(() => verifyOAuthState({ state, secret, now })).toThrow(
      /expired OAuth state/,
    )
  })
})
