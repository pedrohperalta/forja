import { MobileAuthRefreshRequestSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { errorResponse, jsonWithRequestId, requestId } from '@/server/http/responses'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const payload = MobileAuthRefreshRequestSchema.safeParse(
    await request.json().catch(() => null),
  )

  if (!payload.success) {
    return errorResponse('invalid_request', 'Invalid request', 400, id)
  }

  try {
    const result = await createDefaultMobileAuthService().refreshMobileTokens(
      payload.data,
    )

    return jsonWithRequestId(result, 200, id)
  } catch (error) {
    return errorResponse(
      'invalid_token',
      error instanceof Error ? error.message : 'Invalid token',
      401,
      id,
    )
  }
}
