import { SyncPullResponseSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import { readServerEnv } from '@/server/env'
import {
  errorResponse,
  jsonWithRequestId,
  requestId,
  toErrorResponse,
} from '@/server/http/responses'
import { pullPlanChanges } from '@/server/services/sync/planPullService'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const url = new URL(request.url)
    const response = await pullPlanChanges(getDatabase(), {
      userId: user.id,
      cursor: url.searchParams.get('cursor'),
      cursorSecret: readServerEnv().FORJA_SYNC_CURSOR_SECRET,
    })
    const validated = SyncPullResponseSchema.safeParse(response)

    if (!validated.success) {
      return errorResponse('validation_error', 'Invalid sync response', 500, id)
    }

    return jsonWithRequestId(validated.data, 200, id)
  } catch (error) {
    return toErrorResponse(error, id)
  }
}
