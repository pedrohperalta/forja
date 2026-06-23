import { createDefaultMobileAuthService } from '@/server/auth/defaultService'
import { jsonWithRequestId, requestId, toErrorResponse } from '@/server/http/responses'

export async function GET(request: Request): Promise<Response> {
  const id = requestId(request.headers)

  try {
    const user = await createDefaultMobileAuthService().getCurrentMobileUser({
      authorization: request.headers.get('authorization'),
    })

    return jsonWithRequestId(user, 200, id)
  } catch (error) {
    return toErrorResponse(error, id)
  }
}
