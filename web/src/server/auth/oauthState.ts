import { z } from 'zod'

import { base64UrlDecode, base64UrlEncode, hmacSha256, safeEqual } from './crypto'

const OAuthStatePayloadSchema = z.object({
  flow: z.enum(['mobile', 'admin']),
  redirectUri: z.string().min(1),
  nonce: z.string().min(1),
  expiresAt: z.string().datetime(),
})

export type OAuthStatePayload = z.infer<typeof OAuthStatePayloadSchema>

export type SignOAuthStateInput = {
  payload: OAuthStatePayload
  secret: string
}

export function signOAuthState(input: SignOAuthStateInput): string {
  const payload = base64UrlEncode(JSON.stringify(input.payload))
  const signature = hmacSha256(payload, input.secret)

  return `${payload}.${signature}`
}

export type VerifyOAuthStateInput = {
  state: string
  secret: string
  now: Date
}

export function verifyOAuthState(
  input: VerifyOAuthStateInput,
): OAuthStatePayload {
  const [payload, signature] = input.state.split('.')

  if (!payload || !signature) {
    throw new Error('Invalid OAuth state')
  }

  const expectedSignature = hmacSha256(payload, input.secret)
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('Invalid OAuth state')
  }

  const parsed = OAuthStatePayloadSchema.safeParse(
    JSON.parse(base64UrlDecode(payload)),
  )
  if (!parsed.success) {
    throw new Error('Invalid OAuth state')
  }

  if (new Date(parsed.data.expiresAt) <= input.now) {
    throw new Error('expired OAuth state')
  }

  return parsed.data
}
