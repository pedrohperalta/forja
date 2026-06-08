import { SyncPushRequestSchema, SyncPushResponseSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import {
  errorResponse,
  jsonWithRequestId,
  requestId,
} from '@/server/http/responses'
import { pushWorkoutSessions } from '@/server/services/sync/workoutPushService'

export async function POST(request: Request): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const body: unknown = await request.json()
    const parsed = SyncPushRequestSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse('validation_error', 'Invalid sync payload', 422, id)
    }

    const response = await pushWorkoutSessions(getDatabase(), {
      userId: user.id,
      request: parsed.data,
    })
    const validated = SyncPushResponseSchema.safeParse(response)

    if (!validated.success) {
      return errorResponse('validation_error', 'Invalid sync response', 500, id)
    }

    return jsonWithRequestId(validated.data, 200, id)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse('invalid_request', 'Invalid JSON body', 400, id)
    }

    return errorResponse('unauthenticated', 'Unauthenticated', 401, id)
  }
}
