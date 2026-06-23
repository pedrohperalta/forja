import { randomUUID } from 'node:crypto'

import { badRequest, forbidden, invalidToken, unauthenticated } from '@/server/http/appError'
import {
  createAdminSession,
  createMobileAuthCode,
  createRefreshToken,
  createUser,
  findOAuthAccount,
  findRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  linkOAuthAccount,
  markRefreshTokenRotated,
  revokeRefreshToken,
  revokeRefreshTokenFamily,
  useMobileAuthCode,
  type Database,
} from '../repositories'
import { hmacSha256, randomOpaqueToken } from './crypto'
import type { GoogleOAuthClient, GoogleProfile } from './google'
import { signAccessToken, verifyAccessToken } from './accessToken'
import { signOAuthState, verifyOAuthState } from './oauthState'

const MOBILE_REDIRECT_URI = 'forja://auth/callback'

export type MobileAuthEnv = {
  FORJA_PUBLIC_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET?: string
  FORJA_ALLOWED_USER_EMAILS: string
  FORJA_ACCESS_TOKEN_SECRET: string
  FORJA_REFRESH_TOKEN_SECRET: string
  FORJA_AUTH_CODE_SECRET: string
  FORJA_OAUTH_STATE_SECRET: string
  FORJA_ADMIN_EMAILS?: string
  FORJA_ADMIN_SESSION_SECRET?: string
}

export type StartMobileGoogleOAuthInput = {
  redirectUri: string
  env: Pick<MobileAuthEnv, 'FORJA_PUBLIC_URL' | 'GOOGLE_CLIENT_ID' | 'FORJA_OAUTH_STATE_SECRET'>
  now: Date
  nonce: string
}

export type StartMobileGoogleOAuthResult = {
  url: string
  state: string
}

export function startMobileGoogleOAuth(
  input: StartMobileGoogleOAuthInput,
): StartMobileGoogleOAuthResult {
  if (input.redirectUri !== MOBILE_REDIRECT_URI) {
    throw badRequest('Invalid mobile redirect URI')
  }

  const state = signOAuthState({
    payload: {
      flow: 'mobile',
      redirectUri: input.redirectUri,
      nonce: input.nonce,
      expiresAt: new Date(input.now.getTime() + 10 * 60 * 1000).toISOString(),
    },
    secret: input.env.FORJA_OAUTH_STATE_SECRET,
  })
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', input.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', `${input.env.FORJA_PUBLIC_URL}/api/auth/google/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)

  return { url: url.toString(), state }
}

export type MobileAuthService = ReturnType<typeof createMobileAuthService>

export type CreateMobileAuthServiceInput = {
  db: Database
  env: MobileAuthEnv
  googleClient: GoogleOAuthClient
  randomToken?: () => string
  now?: () => Date
}

export function createMobileAuthService(input: CreateMobileAuthServiceInput): {
  handleGoogleCallback(args: {
    code: string
    state: string
  }): Promise<{ redirectUrl: string; adminSessionToken?: string }>
  exchangeMobileAuthCode(args: { code: string; redirectUri: string }): Promise<{
    user: { id: string; email: string; name: string }
    tokens: { accessToken: string; refreshToken: string; expiresAt: string }
  }>
  refreshMobileTokens(args: {
    refreshToken: string
  }): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }>
  logoutMobile(args: { refreshToken: string }): Promise<{ ok: true }>
  getCurrentMobileUser(args: {
    authorization: string | null
  }): Promise<{ id: string; email: string; name: string }>
} {
  const randomToken = input.randomToken ?? randomOpaqueToken
  const now = input.now ?? (() => new Date())

  return {
    async handleGoogleCallback(args): Promise<{
      redirectUrl: string
      adminSessionToken?: string
    }> {
      const state = verifyOAuthState({
        state: args.state,
        secret: input.env.FORJA_OAUTH_STATE_SECRET,
        now: now(),
      })
      const profile = await input.googleClient.getProfile(args.code)
      assertAllowedEmail(profile.email, input.env.FORJA_ALLOWED_USER_EMAILS)
      const user = await findOrCreateOAuthUser(input.db, profile, now())

      if (state.flow === 'mobile') {
        const code = randomToken()
        await createMobileAuthCode(input.db, {
          userId: user.id,
          codeHash: hmacSha256(code, input.env.FORJA_AUTH_CODE_SECRET),
          redirectUri: state.redirectUri,
          expiresAt: new Date(now().getTime() + 5 * 60 * 1000),
          now: now(),
        })

        const redirectUrl = new URL(state.redirectUri)
        redirectUrl.searchParams.set('code', code)

        return { redirectUrl: redirectUrl.toString() }
      }

      assertAllowedEmail(profile.email, input.env.FORJA_ADMIN_EMAILS ?? '')
      const adminSessionToken = randomToken()
      await createAdminSession(input.db, {
        userId: user.id,
        sessionHash: hmacSha256(
          adminSessionToken,
          requiredSecret(input.env.FORJA_ADMIN_SESSION_SECRET),
        ),
        expiresAt: new Date(now().getTime() + 7 * 24 * 60 * 60 * 1000),
        now: now(),
      })

      return { redirectUrl: state.redirectUri, adminSessionToken }
    },

    async exchangeMobileAuthCode(args): Promise<{
      user: { id: string; email: string; name: string }
      tokens: { accessToken: string; refreshToken: string; expiresAt: string }
    }> {
      if (args.redirectUri !== MOBILE_REDIRECT_URI) {
        throw badRequest('Invalid mobile redirect URI')
      }

      const code = await useMobileAuthCode(
        input.db,
        hmacSha256(args.code, input.env.FORJA_AUTH_CODE_SECRET),
        args.redirectUri,
        now(),
      )
      if (!code) {
        throw unauthenticated('Invalid auth code')
      }

      const user = await findUserById(input.db, code.userId)
      if (!user) {
        throw unauthenticated('Invalid auth code')
      }

      const tokens = await issueMobileTokens({
        db: input.db,
        user: { id: user.id, email: user.email },
        env: input.env,
        refreshToken: randomToken(),
        familyId: randomUUID(),
        now: now(),
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? '',
        },
        tokens,
      }
    },

    async refreshMobileTokens(args): Promise<{
      accessToken: string
      refreshToken: string
      expiresAt: string
    }> {
      const tokenHash = hmacSha256(args.refreshToken, input.env.FORJA_REFRESH_TOKEN_SECRET)
      const existing = await findRefreshTokenByHash(input.db, tokenHash)

      if (!existing || existing.revokedAt || existing.rotatedAt || existing.expiresAt <= now()) {
        if (existing) {
          await revokeRefreshTokenFamily(input.db, existing.familyId, now())
        }
        throw invalidToken('Invalid refresh token')
      }

      await markRefreshTokenRotated(input.db, tokenHash, now())
      const user = await findUserById(input.db, existing.userId)
      if (!user) {
        throw invalidToken('Invalid refresh token')
      }

      return issueMobileTokens({
        db: input.db,
        user: { id: user.id, email: user.email },
        env: input.env,
        refreshToken: randomToken(),
        familyId: existing.familyId,
        now: now(),
      })
    },

    async logoutMobile(args): Promise<{ ok: true }> {
      await revokeRefreshToken(
        input.db,
        hmacSha256(args.refreshToken, input.env.FORJA_REFRESH_TOKEN_SECRET),
        now(),
      )

      return { ok: true }
    },

    async getCurrentMobileUser(args): Promise<{
      id: string
      email: string
      name: string
    }> {
      const token = args.authorization?.startsWith('Bearer ')
        ? args.authorization.slice('Bearer '.length)
        : null
      if (!token) {
        throw unauthenticated('Unauthenticated')
      }

      const payload = verifyAccessToken(token, input.env.FORJA_ACCESS_TOKEN_SECRET, now())
      const user = await findUserById(input.db, payload.sub)
      if (!user) {
        throw unauthenticated('Unauthenticated')
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? '',
      }
    },
  }
}

async function findOrCreateOAuthUser(
  db: Database,
  profile: GoogleProfile,
  now: Date,
): Promise<{ id: string; email: string; name: string | null }> {
  const account = await findOAuthAccount(db, 'google', profile.id)
  if (account) {
    const user = await findUserById(db, account.userId)
    if (!user) {
      throw unauthenticated('OAuth account has no user')
    }

    return user
  }

  const existingUser = await findUserByEmail(db, profile.email)
  const user =
    existingUser ??
    (await createUser(db, {
      email: profile.email,
      name: profile.name,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      now,
    }))

  await linkOAuthAccount(db, {
    userId: user.id,
    provider: 'google',
    providerAccountId: profile.id,
    now,
  })

  return user
}

async function issueMobileTokens(args: {
  db: Database
  user: { id: string; email: string }
  env: Pick<MobileAuthEnv, 'FORJA_ACCESS_TOKEN_SECRET' | 'FORJA_REFRESH_TOKEN_SECRET'>
  refreshToken: string
  familyId: string
  now: Date
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
  const accessToken = signAccessToken({
    userId: args.user.id,
    email: args.user.email,
    secret: args.env.FORJA_ACCESS_TOKEN_SECRET,
    now: args.now,
  })

  await createRefreshToken(args.db, {
    userId: args.user.id,
    tokenHash: hmacSha256(args.refreshToken, args.env.FORJA_REFRESH_TOKEN_SECRET),
    familyId: args.familyId,
    expiresAt: new Date(args.now.getTime() + 30 * 24 * 60 * 60 * 1000),
    now: args.now,
  })

  return {
    accessToken: accessToken.accessToken,
    refreshToken: args.refreshToken,
    expiresAt: accessToken.expiresAt.toISOString(),
  }
}

function assertAllowedEmail(email: string, allowedEmails: string): void {
  const allowed = allowedEmails
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (!allowed.includes(email.toLowerCase())) {
    throw forbidden('Google account is not allowlisted')
  }
}

function requiredSecret(value: string | undefined): string {
  if (!value) {
    throw new Error('Missing required secret')
  }

  return value
}
