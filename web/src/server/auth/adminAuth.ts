import {
  findAdminSessionByHash,
  findUserById,
  revokeAdminSession,
  type Database,
} from '../repositories'
import { hmacSha256, randomOpaqueToken } from './crypto'
import { signOAuthState } from './oauthState'
import { badRequest } from '@/server/http/appError'

export const ADMIN_SESSION_COOKIE = 'forja_admin_session'

export type AdminAuthEnv = {
  FORJA_PUBLIC_URL: string
  GOOGLE_CLIENT_ID: string
  FORJA_OAUTH_STATE_SECRET: string
  FORJA_ADMIN_EMAILS: string
  FORJA_ADMIN_SESSION_SECRET: string
}

export type StartAdminGoogleOAuthInput = {
  returnTo: string
  env: Pick<AdminAuthEnv, 'FORJA_PUBLIC_URL' | 'GOOGLE_CLIENT_ID' | 'FORJA_OAUTH_STATE_SECRET'>
  now: Date
  nonce: string
}

export type StartAdminGoogleOAuthResult = {
  url: string
  state: string
}

export function startAdminGoogleOAuth(
  input: StartAdminGoogleOAuthInput,
): StartAdminGoogleOAuthResult {
  const redirectUri = resolveAdminRedirect(input.returnTo, input.env.FORJA_PUBLIC_URL)
  const state = signOAuthState({
    payload: {
      flow: 'admin',
      redirectUri,
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

export type AdminUser = {
  id: string
  email: string
  name: string
}

export async function getAdminUserFromSessionToken(args: {
  db: Database
  env: Pick<AdminAuthEnv, 'FORJA_ADMIN_EMAILS' | 'FORJA_ADMIN_SESSION_SECRET'>
  sessionToken: string | null
  now: Date
}): Promise<AdminUser | null> {
  if (!args.sessionToken) {
    return null
  }

  const session = await findAdminSessionByHash(
    args.db,
    hmacSha256(args.sessionToken, args.env.FORJA_ADMIN_SESSION_SECRET),
  )
  if (!session || session.revokedAt || session.expiresAt <= args.now) {
    return null
  }

  const user = await findUserById(args.db, session.userId)
  if (!user || !isAllowedAdmin(user.email, args.env.FORJA_ADMIN_EMAILS)) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
  }
}

export async function logoutAdminSession(args: {
  db: Database
  env: Pick<AdminAuthEnv, 'FORJA_ADMIN_SESSION_SECRET'>
  sessionToken: string | null
  now: Date
}): Promise<{ ok: true }> {
  if (args.sessionToken) {
    await revokeAdminSession(
      args.db,
      hmacSha256(args.sessionToken, args.env.FORJA_ADMIN_SESSION_SECRET),
      args.now,
    )
  }

  return { ok: true }
}

export function newAdminNonce(): string {
  return randomOpaqueToken(16)
}

function resolveAdminRedirect(returnTo: string, publicUrl: string): string {
  const base = new URL(publicUrl)
  const redirect = new URL(returnTo, base)

  if (redirect.origin !== base.origin || !redirect.pathname.startsWith('/admin')) {
    throw badRequest('Invalid admin redirect URI')
  }

  return redirect.toString()
}

function isAllowedAdmin(email: string, adminEmails: string): boolean {
  return adminEmails
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase())
}
