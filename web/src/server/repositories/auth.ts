import { and, eq, gt, isNull } from 'drizzle-orm'

import * as schema from '../db/schema'
import {
  required,
  type AdminSessionRow,
  type Database,
  type MobileAuthCodeRow,
  type OAuthAccountRow,
  type RefreshTokenRow,
} from './types'

export type LinkOAuthAccountInput = {
  userId: string
  provider: string
  providerAccountId: string
  now: Date
}

export async function linkOAuthAccount(
  db: Database,
  input: LinkOAuthAccountInput,
): Promise<OAuthAccountRow> {
  const [account] = await db
    .insert(schema.oauthAccounts)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [schema.oauthAccounts.provider, schema.oauthAccounts.providerAccountId],
      set: {
        userId: input.userId,
        updatedAt: input.now,
      },
    })
    .returning()

  return required(account)
}

export async function findOAuthAccount(
  db: Database,
  provider: string,
  providerAccountId: string,
): Promise<OAuthAccountRow | null> {
  const [account] = await db
    .select()
    .from(schema.oauthAccounts)
    .where(
      and(
        eq(schema.oauthAccounts.provider, provider),
        eq(schema.oauthAccounts.providerAccountId, providerAccountId),
      ),
    )
    .limit(1)

  return account ?? null
}

export type CreateRefreshTokenInput = {
  userId: string
  tokenHash: string
  familyId: string
  expiresAt: Date
  now: Date
}

export async function createRefreshToken(
  db: Database,
  input: CreateRefreshTokenInput,
): Promise<RefreshTokenRow> {
  const [token] = await db
    .insert(schema.refreshTokens)
    .values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(token)
}

export async function revokeRefreshToken(
  db: Database,
  tokenHash: string,
  revokedAt: Date,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .update(schema.refreshTokens)
    .set({ revokedAt })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .returning()

  return token ?? null
}

export async function findRefreshTokenByHash(
  db: Database,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .select()
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .limit(1)

  return token ?? null
}

export async function markRefreshTokenRotated(
  db: Database,
  tokenHash: string,
  rotatedAt: Date,
): Promise<RefreshTokenRow | null> {
  const [token] = await db
    .update(schema.refreshTokens)
    .set({ rotatedAt })
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .returning()

  return token ?? null
}

export async function revokeRefreshTokenFamily(
  db: Database,
  familyId: string,
  revokedAt: Date,
): Promise<RefreshTokenRow[]> {
  return db
    .update(schema.refreshTokens)
    .set({ revokedAt })
    .where(eq(schema.refreshTokens.familyId, familyId))
    .returning()
}

export type CreateAdminSessionInput = {
  userId: string
  sessionHash: string
  expiresAt: Date
  now: Date
}

export async function createAdminSession(
  db: Database,
  input: CreateAdminSessionInput,
): Promise<AdminSessionRow> {
  const [session] = await db
    .insert(schema.adminSessions)
    .values({
      userId: input.userId,
      sessionHash: input.sessionHash,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(session)
}

export async function revokeAdminSession(
  db: Database,
  sessionHash: string,
  revokedAt: Date,
): Promise<AdminSessionRow | null> {
  const [session] = await db
    .update(schema.adminSessions)
    .set({ revokedAt })
    .where(eq(schema.adminSessions.sessionHash, sessionHash))
    .returning()

  return session ?? null
}

export async function findAdminSessionByHash(
  db: Database,
  sessionHash: string,
): Promise<AdminSessionRow | null> {
  const [session] = await db
    .select()
    .from(schema.adminSessions)
    .where(eq(schema.adminSessions.sessionHash, sessionHash))
    .limit(1)

  return session ?? null
}

export type CreateMobileAuthCodeInput = {
  userId: string
  codeHash: string
  redirectUri: string
  expiresAt: Date
  now: Date
}

export async function createMobileAuthCode(
  db: Database,
  input: CreateMobileAuthCodeInput,
): Promise<MobileAuthCodeRow> {
  const [code] = await db
    .insert(schema.mobileAuthCodes)
    .values({
      userId: input.userId,
      codeHash: input.codeHash,
      redirectUri: input.redirectUri,
      expiresAt: input.expiresAt,
      createdAt: input.now,
    })
    .returning()

  return required(code)
}

export async function useMobileAuthCode(
  db: Database,
  codeHash: string,
  redirectUriOrUsedAt: string | Date,
  maybeUsedAt?: Date,
): Promise<MobileAuthCodeRow | null> {
  const redirectUri = typeof redirectUriOrUsedAt === 'string' ? redirectUriOrUsedAt : null
  const usedAt = redirectUriOrUsedAt instanceof Date ? redirectUriOrUsedAt : maybeUsedAt

  if (!usedAt) {
    throw new Error('usedAt is required')
  }

  const predicates = [
    eq(schema.mobileAuthCodes.codeHash, codeHash),
    isNull(schema.mobileAuthCodes.usedAt),
    gt(schema.mobileAuthCodes.expiresAt, usedAt),
  ]
  if (redirectUri) {
    predicates.push(eq(schema.mobileAuthCodes.redirectUri, redirectUri))
  }

  const [code] = await db
    .update(schema.mobileAuthCodes)
    .set({ usedAt })
    .where(and(...predicates))
    .returning()

  return code ?? null
}

export async function useMobileAuthCodeDeprecated(
  db: Database,
  codeHash: string,
  usedAt: Date,
): Promise<MobileAuthCodeRow | null> {
  return useMobileAuthCode(db, codeHash, usedAt)
}
