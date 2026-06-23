import { OkResponseSchema } from '@forja/domain'

import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { getDatabase } from '@/server/db/client'
import { jsonWithRequestId, requestId, toErrorResponse } from '@/server/http/responses'
import { deleteWorkoutSession } from '@/server/services/sync/workoutPushService'

type DeleteRouteContext = {
  params: Promise<{
    sessionId: string
  }>
}

export async function DELETE(request: Request, context: DeleteRouteContext): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })
    const { sessionId } = await context.params
    const response = await deleteWorkoutSession(getDatabase(), {
      userId: user.id,
      sessionId,
      now: new Date(),
    })
    const validated = OkResponseSchema.parse(response)

    return jsonWithRequestId(validated, 200, id)
  } catch (error) {
    return toErrorResponse(error, id)
  }
}
