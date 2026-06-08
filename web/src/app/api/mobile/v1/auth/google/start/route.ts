import { MobileAuthGoogleStartRequestSchema } from '@forja/domain'

import { jsonWithRequestId, errorResponse, requestId } from '@/server/http/responses'
import { readServerEnv } from '@/server/env'
import { randomOpaqueToken } from '@/server/auth/crypto'
import { startMobileGoogleOAuth } from '@/server/auth/mobileAuth'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const payload = MobileAuthGoogleStartRequestSchema.safeParse(
    await request.json().catch(() => null),
  )

  if (!payload.success) {
    return errorResponse('invalid_request', 'Invalid request', 400, id)
  }

  try {
    const result = startMobileGoogleOAuth({
      redirectUri: payload.data.redirectUri,
      env: readServerEnv(),
      now: new Date(),
      nonce: randomOpaqueToken(16),
    })

    return jsonWithRequestId({ url: result.url }, 200, id)
  } catch (error) {
    return errorResponse(
      'invalid_request',
      error instanceof Error ? error.message : 'Invalid request',
      400,
      id,
    )
  }
}
