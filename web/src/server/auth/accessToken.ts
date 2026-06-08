import { z } from 'zod'

import { base64UrlDecode, base64UrlEncode, hmacSha256, safeEqual } from './crypto'

const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  exp: z.number().int(),
  iat: z.number().int(),
  typ: z.literal('forja_access'),
})

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>

export type SignAccessTokenInput = {
  userId: string
  email: string
  secret: string
  now: Date
}

export type SignedAccessToken = {
  accessToken: string
  expiresAt: Date
}

export function signAccessToken(input: SignAccessTokenInput): SignedAccessToken {
  const expiresAt = new Date(input.now.getTime() + 15 * 60 * 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: input.userId,
      email: input.email,
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(input.now.getTime() / 1000),
      typ: 'forja_access',
    } satisfies AccessTokenPayload),
  )
  const signature = hmacSha256(`${header}.${payload}`, input.secret)

  return {
    accessToken: `${header}.${payload}.${signature}`,
    expiresAt,
  }
}

export function verifyAccessToken(
  token: string,
  secret: string,
  now: Date,
): AccessTokenPayload {
  const [header, payload, signature] = token.split('.')

  if (!header || !payload || !signature) {
    throw new Error('Invalid access token')
  }

  const expectedSignature = hmacSha256(`${header}.${payload}`, secret)
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Invalid access token')
  }

  const parsed = AccessTokenPayloadSchema.safeParse(
    JSON.parse(base64UrlDecode(payload)),
  )
  if (!parsed.success) {
    throw new Error('Invalid access token')
  }

  if (parsed.data.exp <= Math.floor(now.getTime() / 1000)) {
    throw new Error('Invalid access token')
  }

  return parsed.data
}
