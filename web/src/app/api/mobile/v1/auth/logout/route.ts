import { z } from 'zod'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { errorResponse, jsonWithRequestId, requestId } from '@/server/http/responses'

const LogoutRequestSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)
  const payload = LogoutRequestSchema.safeParse(
    await request.json().catch(() => null),
  )

  if (!payload.success) {
    return errorResponse('invalid_request', 'Invalid request', 400, id)
  }

  const result = await createDefaultMobileAuthService().logoutMobile(payload.data)

  return jsonWithRequestId(result, 200, id)
}
