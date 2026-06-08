import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

export function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

export function hmacSha256(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function randomOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}
